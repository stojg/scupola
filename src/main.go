package main

import (
	"log"
	"net/http"
)

func main() {
	myhttp := http.NewServeMux()
	fs := http.FileServer(http.Dir("./dist/"))
	myhttp.Handle("/", http.StripPrefix("", fs))

	port := "8080"
	log.Println("listening on http://localhost:" + port)
	if err := http.ListenAndServe(":"+port, myhttp); err != nil {
		log.Fatal(err)
	}
}
