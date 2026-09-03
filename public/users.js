async function fetch_videos() {
    const response = await fetch(`/users/${user_id}/videos`)
    const videos = await response.json();
    const container = document.getElementById("video_container");

    videos.forEach(video => {
        const thumbnail_wrapper = document.createElement("div");
        const thumbnail = document.createElement("img");
        const title = document.createElement("h4");
        const date = document.createElement("h5");
        const views = document.createElement("p");
        thumbnail.className = "thumbnail";
        thumbnail_wrapper.className = "thumbnail_wrapper";
        views.textContent = "views: " + video.views;
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
        thumbnail_wrapper.appendChild(date);
        container.appendChild(thumbnail_wrapper);
    });
}
window.addEventListener("DOMContentLoaded", fetch_videos);

const subscribe_button = document.createElement("button");
const subscribe_count = document.createElement("label");
subscribe_count.htmlFor = "subscribe";
subscribe_button.classList = "subscribe";
document.body.appendChild(subscribe_button);
document.body.appendChild(subscribe_count);
async function checkSubscription() {
    try {
            const response = await fetch(`/is_subscribed/${user_id}`);
            const data = await response.json();
            subscribe_button.textContent = data.subscribed ? "Unsubscribe" : "Subscribe";
            subscribe_count.textContent = data.count + " subscribers";
        } catch(error) {
            console.error("Failed to check subscription:", error);
            subscribe_button.textContent = "Subscribe";
        }
};
checkSubscription();

subscribe_button.addEventListener("click", async () => {
    try {
        const response = await fetch(`/subscribe/${user_id}`, { method: "POST" });
        if (response.status === 401) {
            window.location.href = "/login.html";
            return;
        }
        const data = await response.json();
        subscribe_button.textContent = data.subscribed ? "Unsubscribe" : "Subscribe";
        subscribe_count.textContent = data.count + " subscribers";
        console.log("Subscription data:", data);
    } catch(error) {
        console.error("failed to subscribe:", error);
    }
})