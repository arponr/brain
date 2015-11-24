CREATE TABLE nodes (
       id        serial PRIMARY KEY,
       parent_id int,
       tag       text,
       title     text,
       preamble  text,
       content   text
);

CREATE TABLE archives (
       id       serial    PRIMARY KEY,
       node_id  int       REFERENCES nodes NOT NULL,
       title    text,
       preamble text,
       content  text,
       time     timestamp DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ind_node_archive ON archives (node_id);
