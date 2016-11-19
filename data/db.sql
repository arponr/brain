CREATE TABLE nodes (
       tag       text PRIMARY KEY,
       title     text,
       preamble  text,
       content   text
);

CREATE TABLE edges (
       one       text    REFERENCES nodes NOT NULL,
       two       text    REFERENCES nodes NOT NULL,
       PRIMARY KEY (one, two)
);
