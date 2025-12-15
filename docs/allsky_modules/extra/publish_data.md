---
tags:
  - Extra Module
  - Pipeline Day
  - Pipeline Night
  - Pipeline Periodic
  - API Required
---

This module allows data from Allsky to be published to a variety of destinations.

  - **[Redis](https://redis.io){ target="_blank" rel="noopener" .external }** - an in-memory, key–value data store designed for extreme speed, used both as a cache and as a primary database for real-time applications. Unlike traditional relational databases, Redis stores data structures directly—such as strings, lists, sets, sorted sets, hashes, bitmaps, streams, and geospatial indexes—allowing efficient operations with minimal latency. It supports persistence to disk, replication, clustering, and high-availability configurations, making it suitable for large-scale systems. Because Redis operations are atomic and single-threaded per shard, it provides predictable performance while avoiding complex locking. Its combination of speed, versatile data structures, and robust ecosystem makes Redis popular for caching, session storage, message queues, real-time analytics, and pub/sub systems.

  - **[MQTT](https://mqtt.org){ target="_blank" rel="noopener" .external  }** - (Message Queuing Telemetry Transport) is a lightweight, publish–subscribe messaging protocol designed for reliable communication over constrained networks, making it ideal for IoT devices, sensors, and low-bandwidth or high-latency environments. Instead of devices talking directly to each other, all messages flow through a central broker, which routes published messages to subscribers based on topic filters. The protocol is extremely efficient, using small packet sizes and persistent TCP connections, and it supports quality-of-service levels to ensure messages are delivered as reliably as the application requires. With built-in features like retained messages, last-will notifications, and secure transport via TLS, MQTT provides a flexible and scalable foundation for real-time, event-driven systems across everything from home automation to industrial telemetry.
  - **[REST](https://en.wikipedia.org/wiki/REST){ target="_blank" rel="noopener" .external  }** - (Representational State Transfer) is an architectural style for building web services that communicate over HTTP using simple, stateless operations. In REST, resources—such as users, orders, or images—are identified by URLs, and clients interact with them using standard HTTP methods like GET, POST, PUT, and DELETE. Because each request contains all the information needed to process it, the server does not maintain client session state, making REST systems highly scalable and easy to distribute. Responses typically use lightweight formats such as JSON, and REST’s uniform interface simplifies integration across diverse platforms. Its simplicity, predictability, and compatibility with existing web infrastructure make REST one of the most widely used approaches for modern APIs.
  - **[InfluxDB](https://www.influxdata.com){ target="_blank" rel="noopener" .external  }** - is a high-performance, open-source time series database designed specifically for storing and querying timestamped data such as metrics, events, and IoT sensor readings. It organizes data into measurements, tags, fields, and timestamps, enabling efficient indexing and fast retrieval even at very high ingest rates. InfluxDB supports powerful time-based queries, downsampling, and data retention policies that automatically manage storage over time. With its SQL-like query language (InfluxQL) or the more advanced Flux language, it provides flexible analytics capabilities. Optimized for real-time monitoring, observability, and IoT workloads, InfluxDB delivers a scalable and performant foundation for applications that must handle large volumes of chronological data.


## Settings


### General Settings

| Setting | Description |
|--------|-------------|
| Extra Data | The Allsky variables to export |

### Redis

| Setting | Description |
|--------|-------------|
| Publish to Redis | Enable to publish data to the Redis server |
| Redis Host | The hostname or IP address of the Redis host |
| Redis Port | The port number of the Redis server |
| Redis Database | The Redis database number to use |
| Use timestamp | Uses the current timestamp as the Redis key |
| Redis Key | Instead of timestamp use this as the Redis key |
| Password | The password for the Redis server if one is required |


### InfluxDB

| Setting | Description |
|--------|-------------|
| Publish to InfluxDB | Enable to publish data to the InfluxDB server |
| Access Token | The access token for the InfluxDb server |
| Bucket | The InfluxDb Bucket |
| Organization | The InfluxDb Organization |
| Data Types | The allowed data types to export. Only Allsky variables of these types will be exported |

!!! warning  "Data Types"

    InfluxDB only accepts numerical values so please ensure the Data Types contains only numerical data types. If in doubt don't change it

### MQTT

| Setting | Description |
|--------|-------------|
| Publish to MQTT | Enable to publish data to the MQTT server |
| USe Secure Connection | If enabled TLS will be used to connect to the MQTT server |
| MQTT Host | The MQTT host and port number |
| Loop Delay | The loop delay, only increase this if you experience issues with messages missing in the broker |
| MQTT Topic | The MQTT topic to publish data to |
| Username | The Username used to access the MQTT Server |
| Password | The password to use for the above username |
| QoS | The Quality of Service to use, see below for details |

#### Quality of Service (QoS)
MQTT uses a QoS system for publishing data, the table below summarises these

| QoS | Delivery Guarantee | Duplicate Messages? | Speed / Overhead |
|-----|--------------------|---------------------|------------------|
| 0 | Best effort | Possible Loss | Fastest, smallest |
| 1 | At least Once | Yes | Moderate |
| 2 | Exactly Once | No | Slowest, largest overhead |

**QoS 0** — “At most once” (fire-and-forget).

- The publisher sends the message once, with no retries.  
- The broker does not acknowledge receipt.  
- Delivery is not guaranteed; messages may be lost.  
- Fastest and lowest overhead.  

Use when:
Metrics, sensor readings, frequent updates where losing one is acceptable.

**QoS 1** — “At least once” (guaranteed delivery, may be duplicated)

- The publisher sends the message and waits for an ACK (PUBACK) from the broker.
- If no ACK arrives, it retransmits.
- The subscriber may receive duplicates (must handle deduplication if needed).

Guarantee:
The message will be delivered, but possibly more than once.

Use when:
Commands, alerts, data that must arrive but duplicate delivery is acceptable.

**QoS 2** — “Exactly once” (most reliable, highest overhead)

- Uses a four-step handshake (PUBREC, PUBREL, PUBCOMP).
- Ensures no duplicates and no loss.
- Slowest and most bandwidth-heavy option.

Guarantee:
The message arrives once and only once.

Use when:
Billing systems, transactions, state changes where duplicates cannot be tolerated.

### POST (REST)
| Setting | Description |
|--------|-------------|
| Publish to endpoint | Enable to publish data to the enspoint |
| Endpoint | The endpoint to publish data to |

## Available in

=== "Pipelines available In"
    
    <div class="grid cards" markdown>

    -   :fontawesome-solid-sun:{ .lg .middle } __Daytime__

        ---

          - The Day time pipeline

    -   :fontawesome-solid-moon:{ .lg .middle } __Nighttime__

        ---

          - The Night time pipeline

    -   :fontawesome-solid-clock:{ .lg .middle } __Periodic__

        ---

          - The Periodic pipeline

    </div>