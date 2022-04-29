package webserver

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
)

func Start(indexPage string) {

	tmpl := template.Must(template.ParseFiles(indexPage))

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		tmpl.Execute(w, "data goes here")
	})

	fmt.Printf("Starting server at port 8080\n")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
