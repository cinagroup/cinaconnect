using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace OnChainUX.Editor
{
    /// <summary>
    /// Build pipeline integration for OnChainUX.
    /// Handles deep link scheme registration for mobile builds (iOS/Android).
    /// </summary>
    public static class OnChainUXBuildScript
    {
        /// URL schemes for deep linking on iOS.
        private static string[] UrlSchemes => new[] { "wc", "onchainux" };

        /// Associated domains for Universal Links on iOS.
        private static string[] AssociatedDomains => new[]
        {
            "applinks:walletconnect.com",
            "applinks:metamask.app.link",
            "applinks:rnbwapp.com"
        };

        /// Intent filters for Android deep links.
        private static string[][] AndroidIntentFilters => new[]
        {
            new[] { "wc", "onchainux" }
        };

        /// Run the OnChainUX pre-build step.
        public static void PreBuild()
        {
            Debug.Log("[OnChainUX] Running pre-build configuration...");

#if UNITY_IOS
            ConfigureIosBuild();
#elif UNITY_ANDROID
            ConfigureAndroidBuild();
#endif

            Debug.Log("[OnChainUX] Pre-build configuration complete.");
        }

        /// Configure iOS build settings for deep linking.
        public static void ConfigureIosBuild()
        {
#if UNITY_IOS
            // Configure URL schemes in Info.plist
            var plistPath = "Info.plist";
            var plist = new UnityEditor.iOS.Xcode.PlistDocument();
            plist.ReadFromFile(plistPath);

            var rootDict = plist.root;

            // Add URL types
            var urlTypesArray = rootDict.CreateArray("CFBundleURLTypes");
            var urlTypeDict = urlTypesArray.AddDict();
            urlTypeDict.SetString("CFBundleURLName", "OnChainUX");

            var schemesArray = urlTypeDict.CreateArray("CFBundleURLSchemes");
            foreach (var scheme in UrlSchemes)
            {
                schemesArray.AddString(scheme);
            }

            // Add Associated Domains for Universal Links
            var domainsArray = rootDict.CreateArray("com.apple.developer.associated-domains");
            foreach (var domain in AssociatedDomains)
            {
                domainsArray.AddString(domain);
            }

            plist.WriteToFile(plistPath);
            Debug.Log("[OnChainUX] iOS deep link configuration applied.");
#endif
        }

        /// Configure Android build settings for deep linking.
        public static void ConfigureAndroidBuild()
        {
#if UNITY_ANDROID
            // Android deep link configuration would go in AndroidManifest.xml
            // This is typically handled via Unity's AndroidManifest merging
            Debug.Log("[OnChainUX] Android deep link configuration noted. Configure AndroidManifest.xml manually.");
#endif
        }

        /// Build the project with OnChainUX configuration.
        public static BuildReport BuildProject(BuildTarget target, string buildPath)
        {
            PreBuild();

            var options = BuildOptions.None;
            var buildPlayerOptions = new BuildPlayerOptions
            {
                scenes = GetBuildScenes(),
                locationPathName = buildPath,
                target = target,
                options = options
            };

            return BuildPipeline.BuildPlayer(buildPlayerOptions);
        }

        /// Get scenes to include in the build.
        private static string[] GetBuildScenes()
        {
            // Get all enabled scenes from build settings
            var scenes = new string[EditorBuildSettings.scenes.Length];
            for (int i = 0; i < EditorBuildSettings.scenes.Length; i++)
            {
                scenes[i] = EditorBuildSettings.scenes[i].path;
            }
            return scenes;
        }
    }
}
