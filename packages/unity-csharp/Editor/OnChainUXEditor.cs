using UnityEditor;
using UnityEngine;

namespace OnChainUX.Editor
{
    /// <summary>
    /// Unity Editor window for OnChainUX configuration.
    /// Allows setting project ID, relay URL, and app metadata via the Unity Editor.
    /// </summary>
    public class OnChainUXEditorWindow : EditorWindow
    {
        private string _projectId = "";
        private string _relayUrl = "wss://relay.walletconnect.com";
        private string _appName = "";
        private string _appDescription = "";
        private string _appUrl = "";
        private string _appIcons = "";
        private bool _enableDebugLogs = true;

        [MenuItem("Window/OnChainUX/Configuration")]
        public static void ShowWindow()
        {
            var window = GetWindow<OnChainUXEditorWindow>("OnChainUX Config");
            window.minSize = new Vector2(350, 300);
            LoadSettings();
        }

        private static void LoadSettings()
        {
            // Load from EditorPrefs if available
        }

        private void OnGUI()
        {
            EditorGUILayout.Space(10);
            EditorGUILayout.LabelField("OnChainUX Configuration", EditorStyles.boldLabel);
            EditorGUILayout.Space(5);

            EditorGUI.BeginChangeCheck();

            _projectId = EditorGUILayout.TextField("Project ID", _projectId);
            _relayUrl = EditorGUILayout.TextField("Relay URL", _relayUrl);

            EditorGUILayout.Space(10);
            EditorGUILayout.LabelField("App Metadata", EditorStyles.boldLabel);
            EditorGUILayout.Space(5);

            _appName = EditorGUILayout.TextField("App Name", _appName);
            _appDescription = EditorGUILayout.TextArea(_appDescription, GUILayout.Height(60));
            _appUrl = EditorGUILayout.TextField("App URL", _appUrl);
            _appIcons = EditorGUILayout.TextField("Icon URLs (comma-separated)", _appIcons);

            EditorGUILayout.Space(10);
            _enableDebugLogs = EditorGUILayout.Toggle("Enable Debug Logs", _enableDebugLogs);

            if (EditorGUI.EndChangeCheck())
            {
                SaveSettings();
            }

            EditorGUILayout.Space(20);

            if (GUILayout.Button("Generate Config JSON"))
            {
                GenerateConfigJson();
            }

            if (GUILayout.Button("Add OnChainUX Manager to Scene"))
            {
                AddManagerToScene();
            }

            EditorGUILayout.Space(10);
            EditorGUILayout.HelpBox(
                "Configure your OnChainUX project ID and app metadata here.\n" +
                "Click 'Generate Config JSON' to create a configuration file.",
                MessageType.Info
            );
        }

        private void SaveSettings()
        {
            EditorPrefs.SetString("OnChainUX_ProjectId", _projectId);
            EditorPrefs.SetString("OnChainUX_RelayUrl", _relayUrl);
            EditorPrefs.SetString("OnChainUX_AppName", _appName);
            EditorPrefs.SetString("OnChainUX_AppDescription", _appDescription);
            EditorPrefs.SetString("OnChainUX_AppUrl", _appUrl);
            EditorPrefs.SetString("OnChainUX_AppIcons", _appIcons);
            EditorPrefs.SetBool("OnChainUX_DebugLogs", _enableDebugLogs);
        }

        private void GenerateConfigJson()
        {
            var icons = string.IsNullOrEmpty(_appIcons)
                ? "[]"
                : $"[\"{string.Join("\", \"", _appIcons.Split(','))}\"]";

            var json = $@"{{
  ""projectId"": ""{_projectId}"",
  ""metadata"": {{
    ""name"": ""{_appName}"",
    ""description"": ""{_appDescription}"",
    ""url"": ""{_appUrl}"",
    ""icons"": {icons}
  }},
  ""relayUrl"": ""{_relayUrl}""
}}";

            var path = EditorUtility.SaveFilePanel("Save Config", "Assets", "onchainux_config.json", "json");
            if (!string.IsNullOrEmpty(path))
            {
                System.IO.File.WriteAllText(path, json);
                AssetDatabase.Refresh();
                Debug.Log($"OnChainUX config saved to: {path}");
            }
        }

        private void AddManagerToScene()
        {
            var manager = FindObjectOfType<OnChainUXManager>();
            if (manager == null)
            {
                var go = new GameObject("[OnChainUX]");
                manager = go.AddComponent<OnChainUXManager>();

                // Set project ID from settings
                var serialized = new SerializedObject(manager);
                serialized.FindProperty("_projectId").stringValue = _projectId;
                serialized.FindProperty("_relayUrl").stringValue = _relayUrl;
                serialized.FindProperty("_enableDebugLogs").boolValue = _enableDebugLogs;
                serialized.ApplyModifiedProperties();

                Undo.RegisterCreatedObjectUndo(go, "Create OnChainUX Manager");
                Selection.activeGameObject = go;

                Debug.Log("OnChainUX Manager added to scene");
            }
            else
            {
                EditorUtility.DisplayDialog(
                    "OnChainUX",
                    "OnChainUX Manager already exists in the scene.",
                    "OK"
                );
            }
        }
    }
}
