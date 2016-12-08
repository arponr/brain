package socket

import (
	"fmt"
	"io"
	"log"
	"net/http"

	"github.com/gorilla/websocket"

	"github.com/arponr/witt/data"
	"github.com/arponr/witt/ui"
)

type Message struct {
	Id      int        `json:",omitEmpty"`
	Action  string     `json:",omitEmpty"`
	Flags   []string   `json:",omitEmpty"`
	Args    []string   `json:",omitEmpty"`
	Results string     `json:",omitEmpty"`
	Node    *data.Node `json:",omitEmpty"`
}

type Session struct {
	m chan *Message
	u *ui.UI
}

func NewSession() *Session {
	s := &Session{m: make(chan *Message, 1)}
	u := ui.New(s)
	s.u = u
	return s
}

func Handler(w http.ResponseWriter, r *http.Request) {
	c, err := websocket.Upgrade(w, r, nil, 1024, 1024)
	if err != nil {
		log.Println(err)
		return
	}

	s := NewSession()

	go func() {
		for m := range s.m {
			if err := c.WriteJSON(m); err != nil {
				if err != io.EOF {
					log.Println(err)
				}
				return
			}
		}
	}()

	for {
		m := new(Message)
		if err := c.ReadJSON(m); err != nil {
			if err != io.EOF {
				log.Println(err)
			}
			return
		}
		if err := s.Handle(m); err != nil {
			log.Println(err)
		}
	}
}

func (s *Session) SendAction(id int, action string) {
	s.m <- &Message{Id: id, Action: action}
}

func (s *Session) SendResults(id int, action string, results string) {
	s.m <- &Message{Id: id, Action: action, Results: results}
}

func (s *Session) SendNode(id int, action string, node *data.Node) {
	s.m <- &Message{Id: id, Action: action, Node: node}
}

func (s *Session) Handle(m *Message) (err error) {
	defer func() {
		if err != nil {
			s.m <- &Message{
				Id:      m.Id,
				Action:  "results",
				Results: err.Error(),
			}
		}
	}()

	switch a := m.Action; a {
	case "ping":
		return nil
	case "cd", "mknode", "rmnode":
		if len(m.Args) != 1 {
			return fmt.Errorf("%v accepts exactly one argument (node tag)", a)
		}
		tag := m.Args[0]
		switch a {
		case "cd":
			return s.u.LoadNode(m.Id, tag)
		case "mknode":
			return s.u.NewNode(m.Id, tag)
		case "rmnode":
			return s.u.DeleteNode(m.Id, tag)
		}
	case "mkedge", "rmedge":
		if len(m.Args) != 2 {
			return fmt.Errorf("%v accepts exactly two arguments (node tags)", a)
		}
		tagOne, tagTwo := m.Args[0], m.Args[1]
		switch a {
		case "mkedge":
			return s.u.NewEdge(tagOne, tagTwo)
		case "rmedge":
			return s.u.DeleteEdge(tagOne, tagTwo)
		}
	case "update":
		return s.u.UpdateNode(m.Node)
	default:
		return fmt.Errorf("command not recognized: %v", a)
	}

	return nil
}
