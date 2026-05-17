{{/*
cinaconnect.labels — shared label selector
*/}}
{{- define "cinaconnect.labels" -}}
app.kubernetes.io/name: {{ include "cinaconnect.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "cinaconnect.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}
