package data

import (
	"database/sql"
	"fmt"
	"os"
	//	"sort"
	// "time"
	_ "github.com/lib/pq"
)

type Node struct {
	Tag      string
	Title    string
	Preamble string
	Content  string
}

type Edge struct {
	One string
	Two string
}

// type byTitle []*Node

// func (t byTitle) Len() int           { return len(t) }
// func (t byTitle) Swap(i, j int)      { t[i], t[j] = t[j], t[i] }
// func (t byTitle) Less(i, j int) bool { return t[i].Title < t[j].Title }

var db *sql.DB

func OpenDB() error {
	var err error
	db, err = sql.Open("postgres", os.Getenv("DATABASE_URL"))
	return err
}

func GetNode(tag string) (*Node, error) {
	n := &Node{Tag: tag}
	q := "SELECT title, preamble, content FROM nodes WHERE tag = $1"
	err := db.QueryRow(q, tag).Scan(&n.Title, &n.Preamble, &n.Content)
	return n, err
}

func NewNode(tag string) (*Node, error) {
	n := &Node{
		Tag:      tag,
		Title:    "New Node",
		Preamble: "",
		Content:  "",
	}
	q := "INSERT INTO nodes (tag, title, preamble, content) VALUES ($1, $2, $3, $4)"
	_, err := db.Exec(q, n.Tag, n.Title, n.Preamble, n.Content)
	return n, err
}

func UpdateNode(tag string, n *Node) error {
	// if tag != n.Tag {
	// 	q := "UPDATE edges SET " +
	// 		"CASE " +
	// 		"WHEN one = $2 THEN one = LEAST($1,two), two = GREATEST($1,two) " +
	// 		"WHEN two = $2 THEN one = LEAST($1,one), two = GREATEST($1,one) " +
	// 		"END " +
	// 		"WHERE one = $2 OR two = $2"
	// 	_, err := db.Exec(q, n.Tag, tag)
	// 	if err != nil {
	// 		return err
	// 	}
	// }

	q := "UPDATE nodes SET title = $2, preamble = $3, content = $4 WHERE tag = $1"
	_, err := db.Exec(q, tag, n.Title, n.Preamble, n.Content)
	return err
}

func MoveNode(tagOld, tagNew string) error {
	// if tag != n.Tag {
	// 	q := "UPDATE edges SET " +
	// 		"CASE " +
	// 		"WHEN one = $2 THEN one = LEAST($1,two), two = GREATEST($1,two) " +
	// 		"WHEN two = $2 THEN one = LEAST($1,one), two = GREATEST($1,one) " +
	// 		"END " +
	// 		"WHERE one = $2 OR two = $2"
	// 	_, err := db.Exec(q, n.Tag, tag)
	// 	if err != nil {
	// 		return err
	// 	}
	// }

	q := "UPDATE nodes SET title = $2, preamble = $3, content = $4 WHERE tag = $1"
	_, err := db.Exec(q, tag, n.Title, n.Preamble, n.Content)
	return err
}

// func ArchiveNode(n *Node) error {
// 	q := "INSERT INTO archives (node_id, content) VALUES ($1, $2, $3)"
// 	_, err := db.Exec(q, n.Id, n.Content)
// 	return err
// }

func DeleteNode(tag string) error {
	q := "DELETE FROM edges WHERE one = $1 OR two = $1"
	_, err := db.Exec(q, tag)
	if err != nil {
		return err
	}

	q = "DELETE FROM nodes WHERE tag = $1"
	_, err = db.Exec(q, tag)
	return err
}

func NewEdge(tagOne, tagTwo string) error {
	if tagOne > tagTwo {
		tagOne, tagTwo = tagTwo, tagOne
	} else if tagOne == tagTwo {
		return fmt.Errorf("self-edges are useless. i think.")
	}
	q := "INSERT INTO edges (one, two) VALUES ($1, $2)"
	_, err := db.Exec(q, tagOne, tagTwo)
	return err
}

func DeleteEdge(tagOne, tagTwo string) error {
	if tagOne > tagTwo {
		tagOne, tagTwo = tagTwo, tagOne
	}
	q := "DELETE FROM edges WHERE one = $1 AND two = $2"
	_, err := db.Exec(q, tagOne, tagTwo)
	return err
}
