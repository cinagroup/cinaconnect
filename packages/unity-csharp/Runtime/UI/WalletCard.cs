using UnityEngine;
using UnityEngine.UI;
using System;
using System.Collections;

namespace OnChainUX.UI
{
    /// <summary>
    /// Wallet card component for the Connect Modal.
    /// Displays wallet name, icon, and handles click events.
    /// 
    /// Attach to the wallet card prefab in the ConnectModal's list.
    /// </summary>
    [RequireComponent(typeof(Button))]
    public class WalletCard : MonoBehaviour
    {
        [Header("UI References")]
        [SerializeField] private Text _walletNameText;
        [SerializeField] private Image _walletIconImage;
        [SerializeField] private GameObject _installedBadge;

        private WalletInfo _wallet;
        private Button _button;

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

            if (_walletIconImage != null && !string.IsNullOrEmpty(wallet.IconUrl))
                StartCoroutine(LoadWalletIcon(wallet.IconUrl));

            // Show installed badge if applicable (mobile only)
            if (_installedBadge != null)
                _installedBadge.SetActive(false);
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
                    Debug.LogWarning($"Failed to load wallet icon: {url}");
                }
            }
        }

        private void HandleClick()
        {
            OnClick?.Invoke();
        }
    }
}
