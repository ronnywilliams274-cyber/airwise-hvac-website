/* =====================================================================
   PEXELS MEDIA SLOTS
   Each slot is filled from Pexels. To use a specific photo or video,
   open it on pexels.com and copy the number at the end of its URL into "id",
   e.g. https://www.pexels.com/video/person-using-a-paint-roller-5583173/ -> 5583173
   Without an "id" (or if it fails), the "query" search is used and result
   number "pick" (0 = first) is taken.
   Keep the part between the outer { } strict JSON (double quotes, no comments)
   because DOWNLOAD-MEDIA.bat reads it too.
   ===================================================================== */
window.AIRWISE_MEDIA_SLOTS = {
  "heroDesktop":      { "type": "video", "query": "air conditioner repair", "orientation": "landscape", "pick": 0, "width": 1920 },
  "heroMobile":       { "type": "video", "query": "air conditioning technician", "orientation": "portrait", "pick": 0, "width": 900 },
  "svcInstall":       { "type": "photo", "id": 33671149, "query": "hvac technician installing", "orientation": "portrait" },
  "svcRetrofit":      { "type": "photo", "id": 27134985, "query": "outdoor air conditioner unit", "orientation": "portrait" },
  "svcConstruction":  { "type": "video", "id": 4198818, "query": "house under construction", "orientation": "landscape", "width": 1280 },
  "svcPaint":         { "type": "video", "id": 5583173, "query": "paint roller wall", "orientation": "landscape", "width": 1280 },
  "svcMaintenance":   { "type": "photo", "id": 5463580, "query": "air conditioner maintenance", "orientation": "portrait" },
  "processVideo":     { "type": "video", "query": "hvac technician", "orientation": "landscape", "pick": 1, "width": 1280 },
  "comfortRoom":      { "type": "photo", "query": "bright modern living room", "orientation": "landscape" },
  "offerVideo":       { "type": "video", "query": "winter house snow", "orientation": "landscape", "pick": 0, "width": 1280 }
};
