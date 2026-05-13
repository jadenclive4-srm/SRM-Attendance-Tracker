package attendance.example.backend.service;

import attendance.example.backend.dto.SignupRequest;
import attendance.example.backend.exception.ApiException;
import attendance.example.backend.model.DeletionRequest;
import attendance.example.backend.model.Employee;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class EmployeeService {

    private final Firestore firestore;
    private final NotificationService notificationService;

    public EmployeeService(Firestore firestore, NotificationService notificationService) {
        this.firestore = firestore;
        this.notificationService = notificationService;
    }

    public List<Employee> getEmployees() throws Exception {
        ApiFuture<QuerySnapshot> future = employeesCollection().get();
        List<QueryDocumentSnapshot> docs = future.get().getDocuments();
        List<Employee> employees = new ArrayList<>();
        for (QueryDocumentSnapshot doc : docs) {
            Employee employee = doc.toObject(Employee.class);
            employee.setId(doc.getId());
            employees.add(sanitize(employee));
        }
        employees.sort(Comparator.comparing(Employee::getFullName, String.CASE_INSENSITIVE_ORDER));
        return employees;
    }

    public Optional<Employee> findById(String id) throws Exception {
        DocumentReference docRef = employeesCollection().document(id);
        var snapshot = docRef.get().get();
        if (!snapshot.exists()) {
            return Optional.empty();
        }
        Employee employee = snapshot.toObject(Employee.class);
        if (employee == null) {
            return Optional.empty();
        }
        employee.setId(snapshot.getId());
        return Optional.of(sanitize(employee));
    }

    public Optional<Employee> findByEmployeeId(String employeeId) throws Exception {
        ApiFuture<QuerySnapshot> future = employeesCollection()
                .whereEqualTo("employeeId", normalizeEmployeeId(employeeId))
                .limit(1)
                .get();
        List<QueryDocumentSnapshot> docs = future.get().getDocuments();
        if (docs.isEmpty()) {
            return Optional.empty();
        }
        QueryDocumentSnapshot doc = docs.get(0);
        Employee employee = doc.toObject(Employee.class);
        employee.setId(doc.getId());
        return Optional.of(sanitize(employee));
    }

    public Optional<Employee> findByEmail(String email) throws Exception {
        ApiFuture<QuerySnapshot> future = employeesCollection()
                .whereEqualTo("email", normalizeEmail(email))
                .limit(1)
                .get();
        List<QueryDocumentSnapshot> docs = future.get().getDocuments();
        if (docs.isEmpty()) {
            return Optional.empty();
        }
        QueryDocumentSnapshot doc = docs.get(0);
        Employee employee = doc.toObject(Employee.class);
        employee.setId(doc.getId());
        return Optional.of(sanitize(employee));
    }

    public Employee createEmployee(String uid, SignupRequest request) throws Exception {
        Employee employee = new Employee();
        employee.setId(uid);
        employee.setEmployeeId(resolveEmployeeId(request));
        employee.setFullName(requireText(request.getFullName(), "Full name is required"));
        employee.setDesignation(defaultIfBlank(request.getDesignation(), "Programmer Analyst"));
        employee.setTeam(defaultIfBlank(request.getTeam(), "Platform"));
        employee.setEmail(normalizeEmail(request.getEmail()));
        employee.setCity(defaultIfBlank(request.getCity(), "Bengaluru"));
        
        // Validate and set state
        String state = request.getState();
        if (state != null && !state.isBlank()) {
            if (!isValidIndianState(state)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Please select a valid Indian state");
            }
            employee.setState(state.trim());
        } else {
            employee.setState("Karnataka");
        }
        
        employee.setCountry(defaultIfBlank(request.getCountry(), "India"));
        employee.setAvatarColor(defaultIfBlank(request.getAvatarColor(), avatarColorFor(employee.getEmployeeId())));
        employee.setRole(resolveRole(employee.getEmployeeId()));
        employee.setStatus("active");

        employeesCollection().document(uid).set(employee).get();
        return sanitize(employee);
    }

    public Employee requireEmployee(String id) throws Exception {
        return findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Employee not found"));
    }

    public void ensureUniqueSignup(SignupRequest request) throws Exception {
        String employeeId = resolveEmployeeId(request);
        if (findByEmployeeId(employeeId).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "Employee ID already exists");
        }
        if (findByEmail(request.getEmail()).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already exists");
        }
    }

    public Optional<DeletionRequest> findDeletionRequestByEmployeeId(String employeeId) throws Exception {
        String normalized = normalizeEmployeeId(employeeId);
        DocumentReference docRef = deletionRequestsCollection().document(normalized);
        DocumentSnapshot snapshot = docRef.get().get();
        if (!snapshot.exists()) {
            return Optional.empty();
        }
        DeletionRequest request = snapshot.toObject(DeletionRequest.class);
        if (request == null) {
            return Optional.empty();
        }
        request.setId(snapshot.getId());
        return Optional.of(request);
    }

    public DeletionRequest createDeletionRequest(String employeeId) throws Exception {
        String normalized = normalizeEmployeeId(employeeId);
        Employee employee = findByEmployeeId(normalized)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Employee not found"));

        Optional<DeletionRequest> existing = findDeletionRequestByEmployeeId(normalized);
        if (existing.isPresent()) {
            String status = existing.get().getStatus();
            if ("pending".equalsIgnoreCase(status)) {
                throw new ApiException(HttpStatus.CONFLICT, "A deletion request is already pending");
            }
            if ("approved".equalsIgnoreCase(status)) {
                throw new ApiException(HttpStatus.CONFLICT, "This account has already been approved for deletion");
            }
        }

        DeletionRequest request = new DeletionRequest();
        request.setId(normalized);
        request.setEmployeeId(normalized);
        request.setStatus("pending");
        request.setRequestedAt(Instant.now().toString());
        request.setRequestedBy(normalized);

        deletionRequestsCollection().document(normalized).set(request).get();

        notificationService.createNotification(
                employee.getId(),
                "info",
                "Deletion request sent to admin",
                "Your account deletion request has been submitted and is pending admin approval.",
                "View status",
                "/profile"
        );
        return request;
    }

    public List<DeletionRequest> getPendingDeletionRequests() throws Exception {
        ApiFuture<QuerySnapshot> future = deletionRequestsCollection()
                .whereEqualTo("status", "pending")
                .get();
        List<QueryDocumentSnapshot> docs = future.get().getDocuments();
        List<DeletionRequest> requests = new ArrayList<>();
        for (QueryDocumentSnapshot doc : docs) {
            DeletionRequest request = doc.toObject(DeletionRequest.class);
            if (request != null) {
                request.setId(doc.getId());
                requests.add(request);
            }
        }
        return requests;
    }

    public DeletionRequest approveDeletionRequest(String employeeId, String reviewerId) throws Exception {
        DeletionRequest request = findDeletionRequestByEmployeeId(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Deletion request not found"));

        if (!"pending".equalsIgnoreCase(request.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only pending requests can be approved");
        }

        request.setStatus("approved");
        request.setReviewedBy(reviewerId);
        request.setReviewedAt(Instant.now().toString());
        deletionRequestsCollection().document(request.getId()).set(request).get();

        Employee employee = findByEmployeeId(request.getEmployeeId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Employee not found"));
        employee.setStatus("inactive");
        employeesCollection().document(employee.getId()).set(employee).get();

        notificationService.createNotification(
                employee.getId(),
                "alert",
                "Deletion request approved",
                "Your account deletion request has been approved by the admin. Your account will be deactivated.",
                null,
                null
        );
        return request;
    }

    public void dismissDeletionRequest(String employeeId) throws Exception {
        DeletionRequest request = findDeletionRequestByEmployeeId(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Deletion request not found"));

        if (!"pending".equalsIgnoreCase(request.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only pending requests can be dismissed");
        }

        request.setStatus("dismissed");
        deletionRequestsCollection().document(request.getId()).set(request).get();

        Employee employee = findByEmployeeId(request.getEmployeeId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Employee not found"));

        notificationService.createNotification(
                employee.getId(),
                "info",
                "Deletion request dismissed",
                "Your account deletion request has been dismissed by the admin.",
                null,
                null
        );
    }

    private CollectionReference deletionRequestsCollection() {
        return firestore.collection("employee_deletion_requests");
    }

    private boolean isValidIndianState(String state) {
        String[] indianStates = {
                "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
                "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
                "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
                "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
                "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
                "Uttar Pradesh", "Uttarakhand", "West Bengal"
        };
        
        for (String validState : indianStates) {
            if (validState.equalsIgnoreCase(state.trim())) {
                return true;
            }
        }
        return false;
    }

    public String resolveEmployeeId(SignupRequest request) {
        String raw = request.getEmployeeId();
        if (raw == null || raw.isBlank()) {
            raw = request.getEmpId();
        }
        raw = requireText(raw, "Employee ID is required");
        String normalized = normalizeEmployeeId(raw);
        
        // Validate Employee ID format: Ixxxx or Axxxx where x are digits
        if (!normalized.matches("^[IA]\\d{4}$")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Employee ID must be in format I1234 or A1234");
        }
        
        return normalized;
    }

    public String resolveRole(String employeeId) {
        return employeeId.toLowerCase(Locale.ROOT).startsWith("admin") ? "admin" : "user";
    }

    public Employee sanitize(Employee employee) {
        if (employee.getRole() == null || employee.getRole().isBlank()) {
            employee.setRole(resolveRole(employee.getEmployeeId()));
        }
        if (employee.getStatus() == null || employee.getStatus().isBlank()) {
            employee.setStatus("active");
        }
        return employee;
    }

    public String normalizeEmployeeId(String employeeId) {
        return requireText(employeeId, "Employee ID is required").toUpperCase(Locale.ROOT);
    }

    public String normalizeEmail(String email) {
        String normalized = requireText(email, "Email is required").toLowerCase(Locale.ROOT);
        
        // Validate email format with @srmtech.com domain
        if (!normalized.matches("^[a-zA-Z0-9._%+-]+@srmtech\\.com$")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only srmtech.com email addresses are allowed");
        }
        
        return normalized;
    }

    private String requireText(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private String defaultIfBlank(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value.trim();
    }

    private String avatarColorFor(String employeeId) {
        String[] palette = {
                "#2563EB", "#059669", "#EA580C", "#7C3AED", "#DC2626", "#0F766E"
        };
        int index = Math.abs(employeeId.hashCode()) % palette.length;
        return palette[index];
    }

    private CollectionReference employeesCollection() {
        return firestore.collection("employees");
    }
}
