package attendance.example.backend.service;

import attendance.example.backend.model.Notification;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ExecutionException;

@Service
public class NotificationService {

    private final Firestore firestore;

    public NotificationService(Firestore firestore) {
        this.firestore = firestore;
    }

    public List<Notification> getNotificationsByEmployee(String employeeId) throws Exception {
        ApiFuture<QuerySnapshot> future = notificationsCollection()
                .whereEqualTo("employeeId", employeeId)
                .get();
        List<QueryDocumentSnapshot> docs = future.get().getDocuments();
        List<Notification> list = new ArrayList<>();
        for (QueryDocumentSnapshot doc : docs) {
            Notification n = doc.toObject(Notification.class);
            if (n != null) {
                n.setId(doc.getId());
                list.add(n);
            }
        }
        list.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        if (list.size() > 50) {
            list = list.subList(0, 50);
        }
        return list;
    }

    public List<Notification> getUnreadNotificationsByEmployee(String employeeId) throws Exception {
        ApiFuture<QuerySnapshot> future = notificationsCollection()
                .whereEqualTo("employeeId", employeeId)
                .whereEqualTo("read", false)
                .get();
        List<QueryDocumentSnapshot> docs = future.get().getDocuments();
        List<Notification> list = new ArrayList<>();
        for (QueryDocumentSnapshot doc : docs) {
            Notification n = doc.toObject(Notification.class);
            if (n != null) {
                n.setId(doc.getId());
                list.add(n);
            }
        }
        list.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        return list;
    }

    public Notification createNotification(String employeeId, String type, String title, String message,
                                            String actionLabel, String actionRoute) throws Exception {
        Notification notification = new Notification();
        notification.setEmployeeId(employeeId);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setCreatedAt(Instant.now().toString());
        notification.setRead(false);
        notification.setActionLabel(actionLabel);
        notification.setActionRoute(actionRoute);

        DocumentReference docRef = notificationsCollection().document();
        docRef.set(notification).get();
        notification.setId(docRef.getId());
        return notification;
    }

    public void markAsRead(String notificationId) throws Exception {
        notificationsCollection().document(notificationId)
                .update("read", true).get();
    }

    public void markAllAsRead(String employeeId) throws Exception {
        ApiFuture<QuerySnapshot> future = notificationsCollection()
                .whereEqualTo("employeeId", employeeId)
                .whereEqualTo("read", false)
                .get();
        List<QueryDocumentSnapshot> docs = future.get().getDocuments();
        for (QueryDocumentSnapshot doc : docs) {
            doc.getReference().update("read", true);
        }
    }

    private CollectionReference notificationsCollection() {
        return firestore.collection("notifications");
    }
}