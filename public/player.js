const subscribe_button = document.createElement("button");
const subscribe_count = document.createElement("label");
subscribe_count.htmlFor = "subscribe";
subscribe_button.classList = "subscribe";
document.body.appendChild(subscribe_button);
document.body.appendChild(subscribe_count);
async function checkSubscription() {
    try {
            const response = await fetch(`/is_subscribed/${uploader}`);
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
        const response = await fetch(`/subscribe/${uploader}`, { method: "POST" });
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