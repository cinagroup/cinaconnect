using UnityEngine;
using UnityEngine.UI;
using System;
using System.Collections;

namespace Cinacoin.UI
{
    /// <summary>
    /// Wallet card component for the Connect Modal.
    /// Displays wallet name, icon, chain support indicators, and handles click events.
    /// 
    /// Attach to the wallet card prefab in the ConnectModal's list.
    /// </summary>
    [RequireComponent(typeof(Button))]
    public class WalletCard : MonoBehaviour
    {
        [Header("UI References")]
        [SerializeField] private Text _walletNameText;
        [SerializeField] private Text _walletSubtitleText;
        [SerializeField] private Image _walletIconImage;
        [SerializeField] private GameObject _installedBadge;
        [SerializeField] private GameObject _chainsSupportedText;

        private WalletInfo _wallet;
        private Button _button;
        private bool _isInstalled;

        /// Event fired when the card is clicked.
        public event Action OnClick;

        private void Awake()
        {
            _button = GetComponent<Button>();
            _button.onClick.AddListener(HandleClick);
        }

        /// Set the wallet data for this card.
        public void SetWallet(WalletInfo wallet)
        {
            _wallet = wallet;

            if (_walletNameText != null)
                _walletNameText.text = wallet.Name;

            // Check if wallet is installed on mobile
            _isInstalled = IsWalletInstalled(wallet);

            // Show subtitle
            if (_walletSubtitleText != null)
            {
                if (_isInstalled)
                {
                    _walletSubtitleText.text = "Installed";
                    _walletSubtitleText.color = new Color(0.13f, 0.59f, 0.43f);
                }
                else
                {
                    _walletSubtitleText.text = "Multi-chain wallet";
                    _walletSubtitleText.color = new Color(0.5f, 0.5f, 0.5f);
                }
            }

            // Show installed badge
            if (_installedBadge != null)
                _installedBadge.SetActive(_isInstalled);

            // Show chains supported
            if (_chainsSupportedText != null && wallet.SupportedChains != null && wallet.SupportedChains.Length > 0)
            {
                var chainCount = wallet.SupportedChains.Length;
                _chainsSupportedText.SetActive(true);
                // Set text if the component has it
            }

            // Load icon
            if (_walletIconImage != null && !string.IsNullOrEmpty(wallet.IconUrl))
            {
                StartCoroutine(LoadWalletIcon(wallet.IconUrl));
            }
        }

        /// Check if wallet app is installed on the device.
        private bool IsWalletInstalled(WalletInfo wallet)
        {
            if (string.IsNullOrEmpty(wallet.DeepLinkScheme))
                return false;

#if UNITY_IOS
            // On iOS, we can check if the URL scheme is registered
            // This requires a native plugin in production
            return false; // Conservative: assume not installed
#elif UNITY_ANDROID
            // On Android, we can check via PackageManager
            // This requires a native plugin in production
            return false; // Conservative: assume not installed
#else
            // Desktop/web: can't check installation
            return false;
#endif
        }

        private IEnumerator LoadWalletIcon(string url)
        {
            using (var www = UnityEngine.Networking.UnityWebRequestTexture.GetTexture(url))
            {
                yield return www.SendWebRequest();

#if UNITY_2020_1_OR_NEWER
                if (www.result == UnityEngine.Networking.UnityWebRequest.Result.Success)
#else
                if (www.isNetworkError == false && www.isHttpError == false)
#endif
                {
                    var texture = DownloadHandlerTexture.GetContent(www);
                    _walletIconImage.sprite = Sprite.Create(
                        texture,
                        new Rect(0, 0, texture.width, texture.height),
                        new Vector2(0.5f, 0.5f)
                    );
                }
                else
                {
                    Debug.LogWarning($"[Cinacoin:WalletCard] Failed to load wallet icon: {url}");
                }
            }
        }

        private void HandleClick()
        {
            OnClick?.Invoke();
        }

        /// Get the wallet info for this card.
        public WalletInfo GetWallet() => _wallet;

        /// Check if the wallet is installed on this device.
        public bool IsInstalled() => _isInstalled;
    }
}
