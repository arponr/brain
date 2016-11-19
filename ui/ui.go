package ui

import (
	"fmt"

	"github.com/arponr/brain/data"
)

type Handler interface {
	SendAction(id int, action string)
	SendResults(id int, action string, results string)
	SendNode(id int, action string, node *data.Node)
}

type UI struct {
	h      Handler
	nodes  map[string]*data.Node
	active string
}

func New(h Handler) *UI {
	return &UI{h: h, nodes: make(map[string]*data.Node)}
}

func (u *UI) LoadNode(id int, tag string) error {
	if tag == u.active {
		return nil
	} else if u.nodes[tag] == nil {
		node, err := data.GetNode(tag)
		if err != nil {
			return fmt.Errorf("error getting node: %v", err.Error())
		}
		u.nodes[tag] = node
	}
	u.h.SendNode(id, "cd", u.nodes[tag])
	u.active = tag
	return nil
}

func (u *UI) NewNode(id int, tag string) error {
	node, err := data.NewNode(tag)
	if err != nil {
		return fmt.Errorf("error creating node: %v", err.Error())
	}
	u.nodes[tag] = node
	u.h.SendNode(id, "cd", u.nodes[tag])
	u.active = tag
	return nil
}

func (u *UI) UpdateNode(node *data.Node) error {
	err := data.UpdateNode(u.active, node)
	if err != nil {
		return fmt.Errorf("error updating node: %v", err.Error())
	}
	u.nodes[u.active] = nil
	u.nodes[node.Tag] = node
	u.active = node.Tag
	return err
}

func (u *UI) DeleteNode(id int, tag string) error {
	err := data.DeleteNode(tag)
	if err != nil {
		return fmt.Errorf("error deleting node: %v", err.Error())
	}
	if u.active == tag {
		u.active = ""
		u.h.SendAction(id, "rm")
	}
	return nil
}

func (u *UI) NewEdge(tagOne, tagTwo string) error {
	err := data.NewEdge(tagOne, tagTwo)
	if err != nil {
		return fmt.Errorf("error creating edge: %v", err.Error())
	}
	return nil
}

func (u *UI) DeleteEdge(tagOne, tagTwo string) error {
	err := data.DeleteEdge(tagOne, tagTwo)
	if err != nil {
		return fmt.Errorf("error deleting edge: %v", err.Error())
	}
	return nil
}
