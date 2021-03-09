### AVIF (HEIC, HEIF)

 - images where metadata is encoded after image data are not supported (not recommended by standard)
 - cropping transformation (`clap` box) is not supported (no supported in browsers yet)

### JPEG

 - exif orientation will not be parsed if exif is placed after image data (not recommended by standard)

### PNG

 - exif orientation is not supported (not supported in browsers)

### WEBP

 - webp files will be downloaded and parsed until the end of the file
