package main

func validation(condition bool, errorMessage string) string {
	if condition {
		return errorMessage
	} else {
		return ""
	}
}

func removeEmpty(errors []string) []string {
	var filtered = []string{}
	for _, e := range errors {
		if e != "" {
			filtered = append(filtered, e)
		}
	}

	return filtered
}

func contains(s []string, e string) bool {
	for _, a := range s {
		if a == e {
			return true
		}
	}
	return false
}
