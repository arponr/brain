package data

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"regexp"
	"sort"
	"time"

	_ "github.com/lib/pq"
)

type Node struct {
	Id       int    `json:"id"`
	ParentId int    `json:"parentId"`
	Tag      string `json:"tag"`
	Title    string `json:"title"`
	Preamble string `json:"preamble"`
	Content  string `json:"content"`
}

type Archive struct {
	NodeId   int
	Title    string
	Preamble string
	Content  string
	Time     time.Time
}

type byTitle []*Node

func (t byTitle) Len() int           { return len(t) }
func (t byTitle) Swap(i, j int)      { t[i], t[j] = t[j], t[i] }
func (t byTitle) Less(i, j int) bool { return t[i].Title < t[j].Title }

var db *sql.DB

func dbURL() string {
	if os.Getenv("LOCALDEV") == "true" {
		return os.Getenv("DATABASE_URL")
	} else {
		regex := regexp.MustCompile(
			"(?i)^postgres://(?:([^:@]+):([^@]*)@)?([^@/:]+):(\\d+)/(.*)$")
		matches := regex.FindStringSubmatch(os.Getenv("DATABASE_URL"))
		if matches == nil {
			log.Fatalf("DATABASE_URL variable must look like: "+
				"postgres://username:password@hostname:port/dbname (not '%v')",
				os.Getenv("DATABASE_URL"))
		}
		sslmode := os.Getenv("PGSSL")
		if sslmode == "" {
			sslmode = "disable"
		}
		return fmt.Sprintf("user=%s password=%s host=%s port=%s dbname=%s sslmode=%s",
			matches[1], matches[2], matches[3], matches[4], matches[5], sslmode)
	}
}

func OpenDB() error {
	var err error
	db, err = sql.Open("postgres", dbURL())
	return err
}

func GetNode(id int) (*Node, error) {
	n := &Node{Id: id}
	q := "SELECT parent_id, tag, title, preamble, content FROM nodes WHERE id = $1"
	err := db.QueryRow(q, id).Scan(&n.ParentId, &n.Tag, &n.Title, &n.Preamble, &n.Content)
	return n, err
}

func GetChildren(parentId int) ([]*Node, error) {
	q := "SELECT id, parent_id, tag, title, preamble, content FROM nodes WHERE parent_id = $1"
	rows, err := db.Query(q, parentId)
	if err != nil {
		return nil, err
	}
	ns := make([]*Node, 0)
	for rows.Next() {
		n := new(Node)
		err = rows.Scan(&n.Id, &n.ParentId, &n.Tag, &n.Title, &n.Preamble, &n.Content)
		if err != nil {
			return nil, err
		}
		ns = append(ns, n)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	sort.Sort(byTitle(ns))
	return ns, nil
}

func UpdateNode(n *Node) error {
	q := "UPDATE nodes SET tag = $1, title = $2, preamble = $3, content = $4 WHERE id = $5"
	_, err := db.Exec(q, n.Tag, n.Title, n.Preamble, n.Content, n.Id)
	return err
}

func DeleteNode(id int) error {
	var parentId int
	q := "DELETE FROM nodes WHERE id = $1 RETURNING parent_id"
	err := db.QueryRow(q, id).Scan(&parentId)
	if err != nil {
		return err
	}
	q = "UPDATE nodes SET parent_id = $1 WHERE parent_id = $2"
	_, err = db.Exec(q, parentId, id)
	return err
}

func NewNode(parentId int) (*Node, error) {
	n := &Node{
		ParentId: parentId,
		Tag:      "new-node",
		Title:    "New Node",
		Preamble: "",
		Content:  "",
	}
	q := "INSERT INTO nodes (parent_id, tag, title, preamble, content) VALUES ($1, $2, $3, $4, $5) RETURNING id"
	err := db.QueryRow(q, n.ParentId, n.Tag, n.Title, n.Preamble, n.Content).Scan(&n.Id)
	return n, err
}

func ArchiveNode(n *Node) error {
	q := "INSERT INTO archives (node_id, content) VALUES ($1, $2, $3)"
	_, err := db.Exec(q, n.Id, n.Content)
	return err
}
