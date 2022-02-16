package main

import (
	"fmt"
	"net/http/httputil"
	"net/url"
	"strconv"
)

type ProxyServer struct {
	Name        string
	Scheme      string
	Host        string
	Port        int
	Connections int
	Url         string
	Proxy       *httputil.ReverseProxy
}

// NewProxy takes target host and creates a reverse proxy
// NewProxy 拿到 targetHost 后，创建一个反向代理
func newProxy(targetHost string) (*httputil.ReverseProxy, error) {
	url, err := url.Parse(targetHost)
	if err != nil {
		return nil, err
	}
	fmt.Printf("new proxy server: %v", url)

	return httputil.NewSingleHostReverseProxy(url), nil
}

func NewProxyServer(Name string, Scheme string, Host string, Port int) ProxyServer {
	if Scheme == "" {
		Scheme = "http"
	}
	if Host == "" {
		Scheme = "127.0.0.1"
	}
	Url := Scheme + "://" + Host
	if Port != 0 {
		Url += ":" + strconv.Itoa(Port)
	}
	Proxy, err := newProxy(Url)
	if err != nil {
		panic(err)
	}
	return ProxyServer{
		Name,
		Scheme,
		Host,
		Port,
		0,
		Url,
		Proxy,
	}
}
