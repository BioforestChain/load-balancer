package main

import (
	"errors"
	"net/http"

	"github.com/gobwas/glob"
)

type RouteBase struct {
	Mode     string     // 模式
	Negation bool       // 取反
	Left     *RouteBase // 联动条件1, 在 :and 模式下有
	Right    *RouteBase // 联动条件2, 在 :and 模式下有
	Value    string     // 在 :path / :header / :method 模式下有
	Key      string     // 只在 :header 模式下有
	glob     glob.Glob  // 只在 :path 模式下有
}

type Route struct {
	RouteBase
	To []string // server names
}

func (proxy *Proxyer) setRoutes() error {
	for _, route := range proxy.Routes {
		if err := newRouteBase(&route.RouteBase); err != nil {
			return err
		}
	}
	return nil
}

func newRouteBase(route *RouteBase) error {
	if route.Mode == ":path" {
		if route.Value == "" {
			return errors.New("(:path)route will no found 'value'")
		}
		route.glob = glob.MustCompile(route.Value)
	} else if route.Mode == ":header" {
		if route.Key == "" {
			return errors.New("(:header)route will no found 'key'")
		}
	} else if route.Mode == ":method" {
		if route.Value != "GET" && route.Value != "POST" && route.Value != "PUT" && route.Value != "DELETE" {
			return errors.New("(:method)route will no allow method value '" + route.Value + "'")
		}
	} else if route.Mode == ":and" {
		if route.Left == nil && route.Right == nil {
			return errors.New("(:and)route will will no found left / right")
		}
	} else {
		return errors.New("unknown route mode:" + route.Mode)
	}
	return nil
}
func (route *RouteBase) matchTo(req *http.Request) bool {
	if route.Mode == ":path" {
		return route.glob.Match(req.URL.Path) && !route.Negation
	} else if route.Mode == ":header" {
		return contains(req.Header[route.Key], route.Value) && !route.Negation
	} else if route.Mode == ":method" {
		return req.Method == route.Value && !route.Negation
	} else if route.Mode == ":and" {
		return route.Left.matchTo(req) && route.Right.matchTo(req) && !route.Negation
	}

	return false
}

func (rs *Proxyer) routesChooseServers(req *http.Request) []*Server {
	toServers := make([]*Server, 0)
	toMap := make(map[string]int)
	// 初始化节点选择表
	for _, server := range rs.Servers {
		// server.name属性为空时，代表着它能受理任何情况的服务
		if server.Name == "" {
			toServers = append(toServers, server)
		} else {
			toMap[server.Name] = 0
		}
	}

	// 选中节点时，最小的阈值
	minChoosedNum := 0

	// 遍历自定义路由，选择节点
	for _, route := range rs.Routes {
		if matched := route.matchTo(req); matched {
			for _, name := range route.To {
				if _, has := toMap[name]; has {
					toMap[name] += 1
					minChoosedNum = 1
				}
			}
		}
	}

	// 挑选出阈值以上的节点
	for name, choosedNum := range toMap {
		if choosedNum >= minChoosedNum {
			toServers = append(toServers, rs.serversMap[name])
		}
	}
	return toServers
}

type ChooseServers []*Server

func (a ChooseServers) Len() int           { return len(a) }
func (a ChooseServers) Less(i, j int) bool { return a[i].Connections < a[j].Connections }
func (a ChooseServers) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }
