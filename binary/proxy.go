package main

import (
	"math"
	"net/http"
	"net/http/httputil"
	"strconv"
)

type Proxy struct {
	Host    string
	Port    int
	Scheme  string
	Servers []ProxyServer
}

func (proxy Proxy) origin() string {
	return (proxy.Scheme + "://" + proxy.Host + ":" + strconv.Itoa(proxy.Port))
}

// TODO: This crashes if we define no servers in our config
func (proxy Proxy) chooseServer(ignoreList []string) *ProxyServer {
	var min = -1
	var minIndex = 0
	for index, server := range proxy.Servers {
		var skip = false
		for _, ignore := range ignoreList {
			if ignore == server.Name {
				skip = true
				break
			}
		}

		if skip {
			continue
		}

		var conn = server.Connections
		if min == -1 {
			min = conn
			minIndex = index
		} else if conn < min {
			min = conn
			minIndex = index
		}
	}

	return &proxy.Servers[minIndex]
}

// ProxyRequestHandler handles the http request using proxy
// ProxyRequestHandler 使用 proxy 处理请求
func ProxyRequestHandler(proxy *httputil.ReverseProxy) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		proxy.ServeHTTP(w, r)
	}
}

func (proxy Proxy) attemptServers(w http.ResponseWriter, r *http.Request, ignoreList []string) {
	if float64(len(ignoreList)) >= math.Min(float64(3), float64(len(proxy.Servers))) {
		LogErr("Failed to find server for request")
		http.NotFound(w, r)
		return
	}

	var server = proxy.chooseServer(ignoreList)
	LogInfo("Got request: " + r.RequestURI)
	LogInfo("Sending to server: " + server.Name)

	server.Connections += 1
	server.Proxy.ServeHTTP(w, r)
	server.Connections -= 1

	LogInfo("Responded to request successfuly")
}

func (proxy Proxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proxy.attemptServers(w, r, []string{})
}

// type ProxyHandler struct {
// 	proxy *Proxy
// }

// func (h *ProxyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
// 	h.proxy.ServeHTTP(w, r)
// }
