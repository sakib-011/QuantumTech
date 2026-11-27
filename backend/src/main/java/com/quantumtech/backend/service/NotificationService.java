package com.quantumtech.backend.service;

import com.quantumtech.backend.model.NotificationLog;
import com.quantumtech.backend.model.Order;
import com.quantumtech.backend.model.StoreSettings;
import com.quantumtech.backend.repository.NotificationLogRepository;
import com.quantumtech.backend.repository.SettingsRepository;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class NotificationService {
    private final MailService mailService;
    private final SettingsRepository settings;
    private final NotificationLogRepository logs;
    private final MongoTemplate mongo;

    public NotificationService(MailService mailService, SettingsRepository settings,
                               NotificationLogRepository logs, MongoTemplate mongo) {
        this.mailService = mailService;
        this.settings = settings;
        this.logs = logs;
        this.mongo = mongo;
    }

    @Async
    public void notifyOwner(Order order) {
        StoreSettings store = settings.findById("store").orElse(new StoreSettings());
        String recipient = store.getOwnerNotificationEmail();
        if (recipient == null || recipient.isBlank()) recipient = "admin@quantumtech.com";

        boolean[] sent = {false};
        for (int attempt = 1; attempt <= 3; attempt++) {
            NotificationLog log = new NotificationLog();
            log.setOrderId(order.getId());
            log.setRecipient(recipient);
            log.setAttemptNo(attempt);
            log.setSentAt(Instant.now());

            sent[0] = mailService.sendOwnerNotification(recipient, order);
            log.setResult(sent[0] ? "Sent" : "Failed");
            if (!sent[0]) log.setErrorMessage("Email delivery failed");
            logs.save(log);

            if (sent[0]) break;
            if (attempt < 3) {
                try {
                    Thread.sleep(60_000);
                } catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }

        // Update only the notification field: saving the whole order here could overwrite an
        // admin status/payment change made while the email was being sent.
        mongo.updateFirst(Query.query(Criteria.where("_id").is(order.getId())),
                new Update().set("notificationStatus", sent[0] ? "Sent" : "Failed"),
                Order.class);
    }
}
