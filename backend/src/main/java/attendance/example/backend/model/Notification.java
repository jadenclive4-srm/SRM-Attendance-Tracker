package attendance.example.backend.model;

public class Notification {
    private String id;
    private String employeeId;
    private String type;       // "info", "warning", "success", "alert"
    private String title;
    private String message;
    private String createdAt;  // ISO timestamp
    private boolean read;
    private String actionLabel;
    private String actionRoute;

    public Notification() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }

    public String getActionLabel() { return actionLabel; }
    public void setActionLabel(String actionLabel) { this.actionLabel = actionLabel; }

    public String getActionRoute() { return actionRoute; }
    public void setActionRoute(String actionRoute) { this.actionRoute = actionRoute; }
}