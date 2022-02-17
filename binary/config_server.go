package main

import (
	"errors"
	"net/http/httputil"
	"net/url"
	"strconv"
)

type Server struct {
	Name        string
	Scheme      string
	Host        string
	Port        int
	Connections int
	Url         string
	Proxy       *httputil.ReverseProxy
}

func (proxy *Proxyer) setServers() error {
	Servers := make([]*Server, 0)
	for _, serverConf := range proxy.Servers {
		Scheme := serverConf.Scheme
		if Scheme == "" {
			Scheme = "http"
		}
		if server, err := newServer(serverConf.Name,
			serverConf.Scheme,
			serverConf.Host,
			serverConf.Port); err != nil {
			return err
		} else {

			Servers = append(Servers, server)
		}
	}
	proxy.Servers = Servers
	return nil
}
func (proxy *Proxyer) setServersMap() error {
	serversMap := make(map[string]*Server)
	for _, server := range proxy.Servers {
		if server.Name == "" {
			continue
		}
		if _, has := serversMap[server.Name]; has {
			return errors.New("duplicate server name:" + server.Name)
		}
		serversMap[server.Name] = server
	}
	proxy.serversMap = serversMap
	return nil
}

func newServer(Name string, Scheme string, Host string, Port int) (*Server, error) {
	if Scheme == "" {
		Scheme = "http"
	}
	if Host == "" {
		Scheme = "127.0.0.1"
	}
	rawURL := Scheme + "://" + Host
	if Port != 0 {
		rawURL += ":" + strconv.Itoa(Port)
	}
	// 检测url格式
	insURL, err := url.Parse(rawURL)
	if err != nil {
		return nil, err
	}
	// 创建一个反向代理
	reverseProxy := httputil.NewSingleHostReverseProxy(insURL)

	proxyServer := &Server{
		Name,
		Scheme,
		Host,
		Port,
		0,
		rawURL,
		reverseProxy,
	}
	return proxyServer, nil
}

type AverageServers []*Server

func (a AverageServers) Len() int           { return len(a) }
func (a AverageServers) Less(i, j int) bool { return a[i].Connections < a[j].Connections }
func (a AverageServers) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }
