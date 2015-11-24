package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/arponr/brain/data"
)

type message map[string]interface{}

func handler(
	h func(input message) (message, error),
	method string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var err error
		defer func() {
			if err != nil {
				log.Println(err)
			}
		}()

		if r.Method != method {
			return
		}

		var input message
		err = json.NewDecoder(r.Body).Decode(&input)
		if err != nil {
			return
		}

		output, err := h(input)
		if err != nil {
			return
		}

		err = json.NewEncoder(w).Encode(output)
	}
}

func getNode(input message) (message, error) {
	id := int(input["id"].(float64))
	node, err := data.GetNode(id)
	output := message{"node": node}
	return output, err
}

func getChildren(input message) (message, error) {
	parentId := int(input["parentId"].(float64))
	children, err := data.GetChildren(parentId)
	output := message{"children": children}
	return output, err
}

func updateNode(input message) (message, error) {
	m := input["node"].(map[string]interface{})
	node := &data.Node{
		Id:       int(m["id"].(float64)),
		ParentId: int(m["parentId"].(float64)),
		Tag:      m["tag"].(string),
		Title:    m["title"].(string),
		Preamble: m["preamble"].(string),
		Content:  m["content"].(string),
	}
	err := data.UpdateNode(node)
	return nil, err
}

func deleteNode(input message) (message, error) {
	id := int(input["id"].(float64))
	err := data.DeleteNode(id)
	return nil, err
}

func newNode(input message) (message, error) {
	parentId := int(input["parentId"].(float64))
	node, err := data.NewNode(parentId)
	output := message{"node": node}
	return output, err
}

func main() {
	var err error
	if err = data.OpenDB(); err != nil {
		log.Fatal(err)
	}

	http.Handle("/", http.FileServer(http.Dir("static")))
	http.HandleFunc("/data/getnode", handler(getNode, "POST"))
	http.HandleFunc("/data/getchildren", handler(getChildren, "POST"))
	http.HandleFunc("/data/updatenode", handler(updateNode, "POST"))
	http.HandleFunc("/data/deletenode", handler(deleteNode, "POST"))
	http.HandleFunc("/data/newnode", handler(newNode, "POST"))

	err = http.ListenAndServe(":"+os.Getenv("PORT"), nil)
	if err != nil {
		log.Fatal(err)
	}
}
