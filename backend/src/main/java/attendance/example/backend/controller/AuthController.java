package attendance.example.backend.controller;

import attendance.example.backend.dto.AuthResponse;
import attendance.example.backend.dto.LoginRequest;
import attendance.example.backend.dto.PasswordChangeRequest;
import attendance.example.backend.dto.SignupRequest;
import attendance.example.backend.model.Employee;
import attendance.example.backend.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "https://srm-attendance-tracker-2.onrender.com")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@RequestBody SignupRequest request, HttpServletResponse response) throws Exception {
        return ResponseEntity.ok(authService.signup(request, response));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request, HttpServletResponse response) throws Exception {
        return ResponseEntity.ok(authService.login(request, response));
    }

    @GetMapping("/me")
    public ResponseEntity<Employee> me(HttpServletRequest request) throws Exception {
        return ResponseEntity.ok(authService.getCurrentUser(request));
    }

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(
            @RequestBody PasswordChangeRequest request,
            HttpServletRequest httpRequest
    ) throws Exception {
        authService.changePassword(httpRequest, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        authService.logout(response);
        return ResponseEntity.noContent().build();
    }
}
