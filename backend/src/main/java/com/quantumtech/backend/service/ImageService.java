package com.quantumtech.backend.service;

import com.cloudinary.Cloudinary;
import com.quantumtech.backend.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Service
public class ImageService {
    private final Cloudinary cloudinary;

    public ImageService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    public String upload(MultipartFile file) {
        if (file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Image file is required");
        }
        String contentType = file.getContentType();
        if (contentType == null || !(contentType.equals("image/jpeg")
                || contentType.equals("image/png")
                || contentType.equals("image/webp"))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only JPG, PNG and WebP images are allowed");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Image must be 5 MB or smaller");
        }
        try {
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(),
                    Map.of("folder", "quantumtech/products", "resource_type", "image"));
            return String.valueOf(result.get("secure_url"));
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Cloudinary credentials are not configured or upload failed");
        }
    }
}
