package attendance.example.backend.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "https://srm-attendance-tracker-2.onrender.com")
public class HomeController {

    @GetMapping("/")
    public String home() {
        return "Backend Running Successfully";
    }
}
