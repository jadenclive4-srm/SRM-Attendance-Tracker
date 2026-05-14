package attendance.example.backend.controller;

import attendance.example.backend.dto.MonthlyDetailsResponse;
import attendance.example.backend.model.AttendanceRecord;
import attendance.example.backend.service.AttendanceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/attendance")
@CrossOrigin(origins = "https://srm-attendance-tracker-2.onrender.com")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @GetMapping
    public ResponseEntity<Map<String, List<AttendanceRecord>>> getAttendanceForEmployees(
            @RequestParam("employeeIds") String employeeIds
    ) throws Exception {
        List<String> ids = Arrays.stream(employeeIds.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toList());
        return ResponseEntity.ok(attendanceService.getAttendanceForEmployees(ids));
    }

    @GetMapping("/monthly-details/{employeeId}")
    public ResponseEntity<List<MonthlyDetailsResponse>> getMonthlyDetails(
            @PathVariable String employeeId,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String type
    ) throws Exception {
        if (month == null || year == null || type == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "month, year, and type parameters are required");
        }
        return ResponseEntity.ok(attendanceService.getMonthlyDetails(employeeId, month, year, type));
    }

    @GetMapping("/{employeeId}")
    public ResponseEntity<List<AttendanceRecord>> getAttendance(
            @PathVariable String employeeId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to
    ) throws Exception {
        return ResponseEntity.ok(attendanceService.getAttendance(employeeId, from, to));
    }

    @PostMapping("/{employeeId}")
    public ResponseEntity<List<AttendanceRecord>> markAttendance(
            @PathVariable String employeeId,
            @RequestBody AttendanceRecord request
    ) throws Exception {
        return ResponseEntity.ok(attendanceService.markAttendance(employeeId, request));
    }
}
