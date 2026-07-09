const SUPABASE_URL = "https://cugxwavmimvlrjkolgeu.supabase.co";
const SUPABASE_KEY = "sb_publishable_ny9GjBJ3K-wgsRkXse6bdw_TcRzmgnB";

const BUCKET_NAME = "gallery-uploads";
const TABLE_NAME = "gallery_images";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const photoInput = document.getElementById("photoInput");
const grid = document.getElementById("grid");
const statusText = document.getElementById("status");
const uploadPanel = document.getElementById("uploadPanel");

const params = new URLSearchParams(window.location.search);

if (params.get("display") === "1") {
  uploadPanel.classList.add("hidden");
}

async function loadImages() {
  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    statusText.textContent = "Could not load images.";
    return;
  }

  renderImages(data);
}

function renderImages(images) {
  grid.innerHTML = "";

  images.forEach((imageRecord) => {
    const img = document.createElement("img");
    img.src = imageRecord.image_url;
    img.alt = "Uploaded gallery image";
    img.loading = "lazy";
    grid.appendChild(img);
  });
}

photoInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];

  if (!file) return;

  statusText.textContent = "Uploading...";

  const originalExtension = file.name.split(".").pop() || "jpg";
  const safeExtension = originalExtension.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;
  const storagePath = `uploads/${fileName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

  if (uploadError) {
    console.error(uploadError);
    statusText.textContent = "Upload failed.";
    return;
  }

  const { data: publicUrlData } = supabaseClient.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  const { error: insertError } = await supabaseClient.from(TABLE_NAME).insert({
    image_url: publicUrlData.publicUrl,
    storage_path: storagePath,
  });

  if (insertError) {
    console.error(insertError);
    statusText.textContent = "Image uploaded, but could not save to archive.";
    return;
  }

  statusText.textContent = "Uploaded!";
  photoInput.value = "";

  await loadImages();
});

loadImages();

setInterval(loadImages, 3000);
