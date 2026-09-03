const express = require("express");
const session = require("express-session");
const multer = require("multer");
const {nanoid} = require("nanoid");
const ffmpeg = require("fluent-ffmpeg");
const bcrypt = require("bcrypt");
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const pool = require("./db");
const app = express();


app.use(express.json());
app.use(express.static("public"));
app.use("/uploads/videos", express.static("uploads/videos"));
app.use("/uploads/thumbnails", express.static("uploads/thumbnails"));
app.use("/uploads/profile_pictures", express.static("uploads/profile_pictures"));

app.use(session({
    secret: process.env.session_id,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 30
    }
}));
//<===================accounts===================>


app.get("/is_subscribed/:uploader", async (req, res) => {
    try {
        const {uploader} = req.params;

        const subscription_count = await pool.query(
            "SELECT subscription_count FROM users WHERE id = $1",
            [uploader]
        );
        const count = subscription_count.rows[0].subscription_count;

        if (!req.session.user) {
            return res.status(401).json({subscribed: false});
        }
        const {username} = req.session.user;
        const result = await pool.query(
            "SELECT id FROM users WHERE username = $1",
            [username]
        );
        const user_id = result.rows[0].id;

        const subscribed = await pool.query(
            "SELECT subscribers FROM users WHERE id = $1",
            [uploader]
        )
        const subscribers = subscribed.rows[0].subscribers;
        const is_subscribed = subscribers.includes(user_id);
        res.json({subscribed: is_subscribed, count});
    }
    catch(error) {
        console.error(error);
        res.status(500).json({subscribed: false});
    };
});


app.post("/subscribe/:uploader", async (req, res) => {
    try {
        const {uploader} = req.params
        const subscription_count = await pool.query(
            "SELECT subscription_count FROM users WHERE id = $1",
            [uploader]
        );

        let count = subscription_count.rows[0].subscription_count;

        if (!req.session.user) {
            return res.status(401).json({subscribed: false});
        }
        const {username} = req.session.user;
        const subscriber = await pool.query(
            "SELECT id FROM users WHERE username = $1",
            [username]
        );
        const user_id = subscriber.rows[0].id;
        const check = await pool.query(
            "SELECT subscribers FROM users WHERE id = $1",
            [uploader]
        );
        const subscribers = check.rows[0].subscribers || [];
        let subscribed;
        if (subscribers.includes(user_id)) {
            const result = await pool.query(
                `UPDATE users
                SET subscribers = array_remove(subscribers, $1),
                subscription_count = subscription_count - 1
                WHERE id = $2
                RETURNING subscription_count`,
                [user_id, uploader]
            );
            subscribed = false;
            count = result.rows[0].subscription_count;
        } else {
            const result = await pool.query(
                `UPDATE users
                SET subscribers = array_append(subscribers, $1),
                subscription_count = subscription_count + 1
                WHERE id = $2
                RETURNING subscription_count`,
                [user_id, uploader]
            );
            subscribed = true;
            count = result.rows[0].subscription_count;
        }
        res.json({subscribed, count});
    }
    catch(error) {
        console.error(error);
    };
});


app.get("/users/:id", async (req, res) => {
    try {
        const {id} = req.params;

        const result = await pool.query(
            "SELECT * FROM users WHERE id = $1",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).send(`
                 <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link rel="stylesheet" href="style.css">
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
                    <title>video uploader-404 page not found</title>
                </head>
                <body>
                    <h1>404 user Not Found</h1>
                    <p>sorry The user you requested does not exist.</p>
                    <a href="/">Go back</a>
                </body>
            `);
        };
        const user = result.rows[0];
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="/style.css">
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
                <title>video uploader-video</title>
            </head>
            <body>
                <h1>${user.username}</h1>
                <p>${user.username}'s videos</p>
                <div id="video_container"></div>
                <script>
                    const user_id = ${id};
                </script>
                <script src="/users.js"></script>
            </body>
        `);
    } 
    catch(error) {
        
    };
});
app.get("/users/:id/videos", async (req, res) => {
    const {id} = req.params;
    const result = await pool.query(
        "SELECT * FROM videos WHERE uploader_id = $1 ORDER BY views DESC",
        [id]
    );
    res.json(result.rows);
});


//<===================login/signup===================>


async function encrypt(password) {
  const hash = await bcrypt.hash(password, 13);
  return hash;
};

app.get("/load_profile_pic", async (req, res) => {
        if (!req.session.user) {
            return res.status(401).json({loggedIn: false});
        }
        const {username} = req.session.user;
        const result = await pool.query(
            "SELECT profile_pic_url FROM users WHERE username = $1",
            [username]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({error: "User not found"});
        }

        const profile_pic_url = result.rows[0].profile_pic_url;
        res.status(200).json({profile_pic_url})
})

app.get("/log_out", async (req, res) => {
    try {
        delete req.session.user;
        res.status(200).json({message: "logged out"})
    }
    catch(error) {
        res.status(500).json({error: "unable to logout"})
    }
})

app.get('/check_session', (req, res) => {
    if (req.session.user) {
        res.json({loggedIn: true});
    }
    else {
        res.json({loggedIn: false});
    };
});

app.post("/signup", async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        };

        const existing = await pool.query(
            "SELECT id FROM users WHERE username = $1",
            [username]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: "Username already taken" });
        };

        const hash = await encrypt(password);
        await pool.query(
            "INSERT INTO users (username, password_hash) VALUES ($1, $2)",
            [username, hash]
        );

        req.session.user = { username };

        res.status(200).json({ message: "Account created", user: username });
    } 
    catch(error) {
        console.error("Signup error:", error);
        res.status(500).json({ error: "Server error" });
    };
});

app.post("/login", async (req, res) => {
const { username, password } = req.body;
    try {
        const result = await pool.query(
            "SELECT password_hash FROM users WHERE username = $1",
            [username]
        );

        if (result.rows.length === 0) {
            console.log("No user found");
            return res.status(401).json({ error: "Invalid username or password" });
        };

        const correct_password = await bcrypt.compare(password, result.rows[0].password_hash);
        console.log("Password check:", correct_password);

        if (!correct_password) {
            return res.status(401).json({ error: "Invalid username or password" });
        };

        req.session.user = { username };
        res.status(200).json({ message: "Login successful", user: username });
    } 
    catch(error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Server error" });
    };
});


//<===================video_retrieve===================>


app.get("/video/:path", async (req, res) => {
    try {
        const {path} = req.params;

        const result = await pool.query(
            "SELECT * FROM videos WHERE path = $1",
            [path]
        );
        if (result.rows.length === 0) {
            return res.status(404).send(`
                 <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link rel="stylesheet" href="style.css">
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
                    <title>video uploader-404 page not found</title>
                </head>
                <body>
                    <h1>404 Video Not Found</h1>
                    <p>sorry The video you requested does not exist.</p>
                    <a href="/">Go back</a>
                </body>
            `);
        };
        const video = result.rows[0];
        const usernameResult = await pool.query(
            "SELECT username FROM users WHERE id = $1",
            [video.uploader_id]
        );
        const uploaderName = usernameResult.rows[0].username;
        await pool.query(
            "UPDATE videos SET views = views + 1 WHERE id = $1",
            [video.id]
        );
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="/style.css">
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
                <title>video uploader-video</title>
            </head>
            <body>
                <video width="720" height="480" controls id="video_player">
                    <source src="/uploads/videos/${video.path}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <p>Views: ${video.views}</p>
                <a href="/users/${video.uploader_id}">uploaded by ${uploaderName}</a>
                <p>Uploaded ${video.upload_date}</p>
                <script>
                    const uploader = ${video.uploader_id};
                </script>
                <script src="/player.js"></script>
            </body>
        `);
    }
    catch(error) {
        console.error(error);
        res.status(500).send("Server error");
    }
})

app.post("/retrieve", async (req, res) => {
    try {
        const { offset, limit } = req.body;

        const result = await pool.query(
            `SELECT videos.*, users.username
            FROM videos
            JOIN users ON videos.uploader_id = users.id
            ORDER BY videos.views DESC
            LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "something went wrong" });
    }
})


//<===================video_upload===================>


async function generate_video_nanoid(ext) {
    while (true) {
        const url = nanoid(11) + ext;
        const result = await pool.query(
            "SELECT COUNT(*) FROM videos WHERE path = $1",
            [url]
        );
        if (parseInt(result.rows[0].count) === 0) {
            return url;
        };
    };
};


async function generate_thumbnail_nanoid(ext) {
    while (true) {
        const url = nanoid(11) + ext;
        const result = await pool.query(
            "SELECT COUNT(*) FROM videos WHERE thumbnail = $1",
            [url]
        );
        if (parseInt(result.rows[0].count) === 0) {
            return url;
        };
    };
};


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads/videos");
    },
    filename: async (req, file, cb) => {
        const url = await generate_video_nanoid(path.extname(file.originalname));
        cb(null, url);
    }
});


const upload = multer({storage});


app.post("/upload", upload.single("video"), async (req, res) => {
    res.status(200).json({message: "video uploaded"});
    console.log("uploaded file " + req.file.filename);


    const title = req.body.title;
    const videopath = req.file.filename;
    const thumbnailpath = await generate_thumbnail_nanoid(".png");


    await new Promise((resolve, reject) => {
        ffmpeg("uploads/videos/" + videopath)
            .size("1280x720")
            .outputOptions(["-c:v libx264", "-preset medium", "-crf 25"])
            .output("uploads/temp/" + videopath)
            .on("end", resolve)
            .on("error", reject)
            .run()
    })


    fs.rename("uploads/temp/" + videopath, "uploads/videos/" + videopath, (error) => {
        if (error) {
            console.error("error moving file:", error);
        } else {
            console.log("file successfully overwritten");
        }
    });


    await new Promise((resolve, reject) => {
        ffmpeg("uploads/videos/" + videopath).screenshots({
            timestamps: ["0%"],
            filename: thumbnailpath,
            folder: "uploads/thumbnails",
            size: "1280x720"
        }).on("end", resolve).on("error", reject);
    })

    const {username} = req.session.user;

    const result = await pool.query(
            "SELECT id FROM users WHERE username = $1",
            [username]
    );
    const id = result.rows[0].id;

    await pool.query(
        `INSERT INTO videos (title, path, thumbnail, uploader_id) VALUES ($1,$2,$3,$4)`,
        [title, videopath, thumbnailpath, id]
    );
});


app.listen(3000, "0.0.0.0", () => {
    console.log("backend running on port 3000");
});