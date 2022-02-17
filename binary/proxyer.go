package main

import (
	"fmt"
	"net/http"
	"sort"
	"strings"
)

type Proxyer struct {
	Host       string
	Port       int
	Scheme     string
	Servers    []*Server
	Routes     []*Route
	serversMap map[string]*Server
	// routesMap  map[string]*Route
}

func (proxy *Proxyer) Format() error {
	proxy.setDefaultValues()
	if err := proxy.validateFields(); err != nil {
		return err
	}
	if err := proxy.setServers(); err != nil {
		return err
	}
	if err := proxy.setServersMap(); err != nil {
		return err
	}
	if err := proxy.setRoutes(); err != nil {
		return err
	}

	return nil
}

func generateValidationErrors(proxy *Proxyer) []string {
	return removeEmpty([]string{
		validation(
			proxy.Host == "",
			"the 'host' field cannot be blank",
		),
		validation(
			proxy.Port == 0,
			"the 'port' field cannot be blank",
		),
		validation(
			len(proxy.Servers) == 0,
			"the config must specify at least 1 server",
		),
		validation(
			proxy.Scheme != "http" && proxy.Scheme != "https",
			"the proxy scheme must be either 'http' or 'https'",
		),
	})
}

func (proxy *Proxyer) setDefaultValues() {
	if proxy.Port == 0 {
		proxy.Port = 80
	}

	if proxy.Scheme == "" {
		proxy.Scheme = "http"
	}
}
func (proxy *Proxyer) validateFields() error {
	var errors = generateValidationErrors(proxy)

	if len(errors) == 0 {
		return nil
	} else {
		return fmt.Errorf(strings.Join(errors, ", "))
	}
}

// 选择节点
func (proxy *Proxyer) attemptServers(w http.ResponseWriter, r *http.Request) {
	LogInfo("Got request: " + r.RequestURI)

	routesChoosedServers := proxy.routesChooseServers(r)
	if len(routesChoosedServers) == 0 {
		LogErr("Failed to find server for request")
		http.NotFound(w, r)
		return
	}

	server := proxy.strategyChooseServer(routesChoosedServers)
	LogInfo("Sending to server: " + server.Name)

	server.Connections += 1
	server.Proxy.ServeHTTP(w, r)
	server.Connections -= 1

	LogInfo("Responded to request successfuly")
}

// 使用调度策略选择节点，这里默认使用平均策略，选择目前处理连接数最少的来进行响应
func (proxy *Proxyer) strategyChooseServer(servers []*Server) *Server {
	sort.Sort(AverageServers(servers))
	return servers[0]
}

func (proxy Proxyer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proxy.attemptServers(w, r)
}

// type ProxyHandler struct {
// 	proxy *Proxy
// }

// func (h *ProxyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
// 	h.proxy.ServeHTTP(w, r)
// }
