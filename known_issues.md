### AVIF (HEIC, HEIF)

 - images where metadata is encoded after image data are not supported (should
   not happen in real world, because such data layout not recommended by standard)
 - cropping transformation (`clap` box) is ignored (anyway, no supported
   by browsers yet)


### JPEG

 - exif (with orientation) is ignored, if placed after image data (should not
   happen in real world, because such data layout not recommended by standard)


### PNG

 - exif (with orientation) is ignored (not supported by browsers anyway)


### WEBP

 - Full download required, because exif data is frequently located at the end
   of file.
