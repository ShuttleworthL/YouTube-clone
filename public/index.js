async function check_logged_in(event) {
    event.preventDefault();
    try {
    const response = await fetch('/check_session');
    const data = await response.json();

    if (data.loggedIn) {
        window.location.href = "/upload.html"
    } else {
        window.location.href = "/login.html";
    }
    } catch(error) {
        console.error("Error checking session:", error);
    }
};

async function show_profile_pic() {
    const response = await fetch("/load_profile_pic");
    if (response.status !== 200) {
        return;
    }
    const data = await response.json();
    console.log(data.profile_pic_url);
    const profile_picture = document.getElementById("profile_picture");
    const login = document.getElementById("login");
    const picture = document.createElement("img");
    picture.src = "/uploads/profile_pictures/" + data.profile_pic_url;
    profile_picture.href = "profile_pic.html"
    login.textContent = "Log Out";
    login.href = ""
    login.onclick = log_out;
    profile_picture.appendChild(picture);
}

async function log_out() {
    const response = await fetch("/log_out");
    if (response.status !== 200) {
        console.error("unable to log out");
    }
    else {
        location.reload();
    };
};

window.addEventListener("DOMContentLoaded", show_profile_pic);

let offset = 0;
const limit = 3;


fetch_videos();
document.getElementById("load_more").addEventListener("click", fetch_videos);


async function fetch_videos() {
    const response = await fetch("/retrieve", {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({offset, limit})
    });


    const videos = await response.json();
    const container = document.getElementById("video_container");


    videos.forEach(video => {
        const thumbnail_wrapper = document.createElement("div");
        const thumbnail = document.createElement("img");
        const title = document.createElement("h4");
        const date = document.createElement("h5");
        const views = document.createElement("p");
        const uploader = document.createElement("a")
        thumbnail.className = "thumbnail";
        thumbnail_wrapper.className = "thumbnail_wrapper";
        views.textContent = "views: " + video.views;
        uploader.textContent = "uploaded by " + video.username;
        uploader.href = "users/" + video.uploader_id;
        date.textContent = "uploaded " + video.upload_date;
        title.textContent = video.title;
        thumbnail.src = "/uploads/thumbnails/" + video.thumbnail;
        thumbnail.width = 320;
        thumbnail.height = 240;
        const link = document.createElement("a");
        link.href = `/video/${video.path}`;
        link.appendChild(thumbnail);
        thumbnail_wrapper.appendChild(link);
        thumbnail_wrapper.appendChild(title);
        thumbnail_wrapper.appendChild(views);
        thumbnail_wrapper.appendChild(uploader);
        thumbnail_wrapper.appendChild(date);
        container.appendChild(thumbnail_wrapper);
    });
    offset += videos.length
};