package com.quantumtech.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** Per-day order sequence, e.g. id {@code order-261123} with seq 7 gives QT-261123-0007. */
@Data
@Document("counters")
public class OrderCounter {
    @Id private String id;
    private long seq;
}
