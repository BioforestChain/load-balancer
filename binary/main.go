package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
)

type ClientMessage struct {
	Cmd  string
	Conf Proxyer
}

// 代理配置
var proxy Proxyer

// 代理服务器
var server *http.Server

var reader = bufio.NewReader(os.Stdin)
var writer = os.Stderr

func returnError(cmd string, err error) {
	errorMessage, _ := json.Marshal(err.Error())
	returnErrorJsonStr(cmd, string(errorMessage))
}
func returnErrorStr(cmd string, jsonErrorMessage string) {
	returnErrorJsonStr(cmd, `"`+jsonErrorMessage+`"`)
}
func returnErrorJsonStr(cmd string, jsonErrorMessage string) {
	writer.WriteString(`{"return":"` + cmd + `","error":` + jsonErrorMessage + `}` + "\n")
}
func returnSuccess(cmd string) {
	writer.WriteString(`{"return":"` + cmd + `","success":true}` + "\n")
}
func listenAndServe(srv *http.Server) error {
	ln, err := net.Listen("tcp", srv.Addr)
	if err != nil {
		return err
	}
	go srv.Serve(ln)
	return nil
}

func handlerMsg(cmsg *ClientMessage) {
	if cmsg.Cmd == "start" {
		if server != nil {
			returnErrorStr(cmsg.Cmd, `proxy server already started.`)
			return
		}

		newProxy := cmsg.Conf
		// 整理格式，验证配置
		if err := newProxy.Format(); err != nil {
			returnError(cmsg.Cmd, err)
			return
		}

		/// 运行服务
		proxy = newProxy
		server = &http.Server{Addr: ":" + strconv.Itoa(proxy.Port), Handler: proxy}
		if err := listenAndServe(server); err != nil {
			returnError(cmsg.Cmd, err)
			return
		}
		// 返回成功
		returnSuccess(cmsg.Cmd)
	} else if cmsg.Cmd == "restart" {
		if server == nil {
			returnErrorStr(cmsg.Cmd, `proxy server no start yet.`)
			return
		}

		// 格式化配置
		newProxy := cmsg.Conf
		// 整理格式，验证配置
		if err := newProxy.Format(); err != nil {
			returnError(cmsg.Cmd, err)
			return
		}

		// 端口一样，不用关闭原来的程序，更新hanlder就行了
		if newProxy.Port == proxy.Port {
			proxy = newProxy
			server.Handler = newProxy
			return
		}

		// 端口不一样，重新进行监听，先监听新端口，再关闭旧端口，确保平滑过渡
		newServer := &http.Server{Addr: ":" + strconv.Itoa(proxy.Port), Handler: proxy}
		if err := listenAndServe(newServer); err != nil {
			returnError(cmsg.Cmd, err)
			return
		}
		server.Close()
		server = newServer
		// 返回成功
		returnSuccess(cmsg.Cmd)
	} else if cmsg.Cmd == "stop" {
		returnSuccess(cmsg.Cmd)
		os.Exit(0)
	}
}

func main() {
	configPtr := flag.String("config", "", "config filepath")
	flag.Parse()

	// 通过配置文件来初始化启动
	if configFilepath := *configPtr; configFilepath != "" {
		jsonFile, err := os.Open(configFilepath)
		if err != nil {
			panic(err)
		}
		fmt.Println("Successfully Opened Config File " + configFilepath)
		defer jsonFile.Close()

		jsonContent, err := ioutil.ReadAll(jsonFile)
		if err != nil {
			panic(err)
		}
		newProxy := Proxyer{}
		json.Unmarshal(jsonContent, &newProxy)

		// 整理格式，验证配置
		if err := newProxy.Format(); err != nil {
			panic(err)
		}
		proxy = newProxy
		server = &http.Server{Addr: ":" + strconv.Itoa(proxy.Port), Handler: proxy}

		if err := listenAndServe(server); err != nil {
			panic(err)
		}
		LogInfo("start proxy server success!")
	}

	// 持续地读取来之stdin的输入来作为指令
	cacheChunk := ""

	for {
		chunk, _ := reader.ReadString('\n')
		cacheChunk += chunk
		startIndex := 0
		for {
			msgSplitIndex := strings.IndexByte(cacheChunk[startIndex:], '\n')
			if msgSplitIndex == -1 {
				break
			}
			msgJson := cacheChunk[0:msgSplitIndex]
			cmsg := &ClientMessage{}
			if err := json.Unmarshal([]byte(msgJson), cmsg); err == nil {
				cacheChunk = cacheChunk[msgSplitIndex+1:]
				fmt.Printf("%v\n", cmsg)
				handlerMsg(cmsg)
			} else {
				startIndex = msgSplitIndex + 1 // JSON可能不完整，挪到写一个\n上再进行寻找
			}
		}
	}

	// LogInfo("Spinning up load balancer...")
	// LogInfo("Reading Config.yml...")
	// proxy, err := ReadConfig()
	// if err != nil {
	// 	LogErr("An error occurred while trying to parse config.yml")
	// 	LogErrAndCrash(err.Error())
	// }
	// // serveMux:= ServeMux

	// http.Handle("/", proxy)
	// err = http.ListenAndServe(":"+strconv.Itoa(proxy.Port), nil)

	// if err != nil {
	// 	LogErr("Failed to bind to port " + strconv.Itoa(proxy.Port))
	// 	LogErrAndCrash("Make sure the port is available and not reserved")
	// }
	// LogInfo("Listening to requests on port: " + strconv.Itoa(proxy.Port))
}

/*

{"cmd":"start","conf":{"scheme":"http","host":"0.0.0.0","port":8888,"servers":[{"name":"Server A","scheme":"http","host":"127.0.0.1","port":9800},{"name":"Server B","scheme":"http","host":"127.0.0.1","port":9801}]}}
*/
