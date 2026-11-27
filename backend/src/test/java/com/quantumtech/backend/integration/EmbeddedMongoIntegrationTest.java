package com.quantumtech.backend.integration;

import de.flapdoodle.embed.mongo.commands.ServerAddress;
import de.flapdoodle.embed.mongo.distribution.Version;
import de.flapdoodle.embed.mongo.transitions.Mongod;
import de.flapdoodle.embed.mongo.transitions.RunningMongodProcess;
import de.flapdoodle.reverse.TransitionWalker;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Starts one real MongoDB process (downloaded and cached on first use under ~/.embedmongo)
 * for all integration tests, so stock updates, unique indexes and queries run against the same
 * engine as production instead of mocks. No Docker or local MongoDB installation is needed.
 */
public abstract class EmbeddedMongoIntegrationTest {
    private static TransitionWalker.ReachedState<RunningMongodProcess> mongod;

    static synchronized String mongoUri() {
        if (mongod == null) {
            mongod = Mongod.instance().start(Version.Main.V7_0);
            Runtime.getRuntime().addShutdownHook(new Thread(() -> mongod.close()));
        }
        ServerAddress address = mongod.current().getServerAddress();
        return "mongodb://" + address.getHost() + ":" + address.getPort() + "/qtechdb_it";
    }

    @DynamicPropertySource
    static void mongoProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", EmbeddedMongoIntegrationTest::mongoUri);
        registry.add("spring.data.mongodb.database", () -> "qtechdb_it");
    }
}
