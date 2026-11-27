package com.quantumtech.backend.controller;

import com.quantumtech.backend.service.ImageService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/uploads")
public class ImageController {
    private final ImageService imageService;

    public ImageController(ImageService imageService) {
        this.imageService = imageService;
    }

    @PostMapping("/image")
    public Map<String, String> upload(@RequestParam("file") MultipartFile file) {
        return Map.of("url", imageService.upload(file));
    }
}
