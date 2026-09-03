const videoinput = document.getElementById("video_upload");
const titleinput = document.getElementById("title_input");
const uploadbtn = document.getElementById("upload");
const progress_bar = document.getElementById("progress_bar");
const progress_counter = document.getElementById("progress_counter");

uploadbtn.addEventListener("click", () => {
    const file = videoinput.files[0]
    const title = titleinput.value.trim()

    if (!file) return window.alert("Please select a video file first");
    if (!title) return window.alert("Please enter a title");

    const form_data = new FormData();
    form_data.append("video", file);
    form_data.append("title", title);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/upload");

    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            progress_bar.style.display = "block";
            progress_counter.style.display = "block";
            progress_bar.value = percent;
            progress_counter.textContent = percent + "%";
            console.log(percent + "%");
        };
    };

    xhr.onload = () => {
        if (xhr.status === 200) {
            console.log("upload complete");
            progress_bar.value = 100;
            progress_counter.textContent = "100%";
            window.alert("upload complete");
            progress_bar.style.display = "none";
            progress_counter.style.display = "none";
        }
        else {
            console.error("upload failed:", xhr.status);
            window.alert("upload failed");
            progress_bar.style.display = "none";
            progress_counter.style.display = "none";
        };
    };

    xhr.onerror = () => window.alert("error while uploading.");
    xhr.send(form_data);
})

document.getElementById("choose_file").addEventListener("click", () => {
    document.getElementById("video_upload").click();
});


const dropzone = document.getElementById("drop_zone");
const video_upload = document.getElementById("video_upload");


dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("drop_zone_hover");
});


dropzone.addEventListener("dragleave", (event) => {
    event.preventDefault()
    dropzone.classList.remove("drop_zone_hover");
});


dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("drop_zone_hover");
    video_upload.files = event.dataTransfer.files;
});