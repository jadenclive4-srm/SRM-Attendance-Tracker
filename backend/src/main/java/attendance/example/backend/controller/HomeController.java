package attendance.example.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeController {

    @GetMapping("/backend")
    public String home() {
        return "Backend Running Successfully";
    }
}
