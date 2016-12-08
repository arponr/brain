package main

import (
	"log"
	"net/http"
	"os"

	"github.com/arponr/witt/data"
	"github.com/arponr/witt/socket"
)

func main() {
	var err error
	if err = data.OpenDB(); err != nil {
		log.Fatal(err)
	}

	http.Handle("/", http.FileServer(http.Dir("static")))
	http.HandleFunc("/socket", socket.Handler)

	err = http.ListenAndServe(":"+os.Getenv("PORT"), nil)
	if err != nil {
		log.Fatal(err)
	}
}
