using System.Threading.Tasks;
using UnityEngine.TestTools;
using NUnit.Framework;
using System.Collections;

namespace OnChainUX.Tests.Runtime
{
    /// <summary>
    /// PlayMode tests for OnChainUX core functionality.
    /// These tests run in the Unity player.
    /// </summary>
    public class OnChainUXTests
    {
        [UnityTest]
        public IEnumerator Initialize_SetsStatusToDisconnected()
        {
            // Create test GameObject
            var go = new UnityEngine.GameObject("[OnChainUX_Test]");
            var manager = go.AddComponent<OnChainUXManager>();

            manager.Initialize("test_project_id",
                new AppMetadata("Test App", "Test", "https://test.com"));

            Assert.That(manager.Status, Is.EqualTo(ConnectionStatus.Disconnected));
            Assert.That(manager.IsConnected, Is.False);
            Assert.That(manager.Accounts, Is.Empty);

            // Cleanup
            Object.DestroyImmediate(go);
            yield return null;
        }

        [UnityTest]
        public IEnumerator Singleton_CreatesInstance()
        {
            // Ensure no existing instance
            var existing = Object.FindObjectOfType<OnChainUXManager>();
            if (existing != null)
                Object.DestroyImmediate(existing.gameObject);

            var instance = OnChainUXManager.Instance;
            Assert.That(instance, Is.Not.Null);
            Assert.That(instance, Is.TypeOf<OnChainUXManager>());

            // Cleanup
            Object.DestroyImmediate(instance.gameObject);
            yield return null;
        }

        [UnityTest]
        public IEnumerator Disconnect_ResetsState()
        {
            var go = new UnityEngine.GameObject("[OnChainUX_Test]");
            var manager = go.AddComponent<OnChainUXManager>();

            manager.Initialize("test", new AppMetadata("Test", "Test", "https://test.com"));

            // Simulate connected state
            manager.GetType().GetField("_status",
                System.Reflection.BindingFlags.NonPublic |
                System.Reflection.BindingFlags.Instance)
                ?.SetValue(manager, ConnectionStatus.Connected);

            // Disconnect
            manager.DisconnectAsync().ConfigureAwait(false);

            // Give Unity time to process
            yield return new WaitForSeconds(0.1f);

            Assert.That(manager.Status, Is.EqualTo(ConnectionStatus.Disconnected));

            // Cleanup
            Object.DestroyImmediate(go);
            yield return null;
        }
    }
}
