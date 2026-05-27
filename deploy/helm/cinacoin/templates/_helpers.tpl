{{/*
cinacoin.labels — shared label selector
*/}}
{{- define "cinacoin.labels" -}}
app.kubernetes.io/name: {{ include "cinacoin.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "cinacoin.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}
