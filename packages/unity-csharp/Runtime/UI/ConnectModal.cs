using UnityEngine;
using UnityEngine.UI;
using System;
using System.Collections;
using System.Collections.Generic;

namespace OnChainUX.UI
{
    /// <summary>
    /// Unity UI Connect Modal panel.
    /// Displays a wallet selection panel with recommended wallets and QR code support.
    /// 
    /// Usage:
    ///   ConnectModal.Instance.Show(wallets: WalletRegistry.GetAll());
    /// </summary>
    public class ConnectModal : MonoBehaviour
    {
        [Header("Modal Settings")]
        [SerializeField] private string title = "Connect a Wallet";
        [SerializeField] private string[] defaultViews = new[] { "wallets" };
        [SerializeField] private string[] recommendedWalletIds;

        [Header("UI References")]
        [SerializeField] private GameObject _modalPanel;
        [SerializeField] private GameObject _walletListContainer;
        [SerializeField] private GameObject _walletCardPrefab;
        [SerializeField] private GameObject _qrCodePanel;
        [SerializeField] private GameObject _closeButton;
        [SerializeField] private Text _titleLabel;

        private List<WalletInfo> _wallets = new List<WalletInfo>();
        private bool _isOpen;

        public static ConnectModal Instance { get; private set; }

        /// Event fired when a wallet is selected.
        public event Action<WalletInfo> OnWalletSelected;

        /// Event fired when the modal is closed.
        public event Action OnClosed;

        /// Whether the modal is currently open.
        public bool IsOpen => _isOpen;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
            }
            else if (Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            if (_closeButton != null)
                _closeButton.GetComponent<Button>().onClick.AddListener(Close);
        }

        private void Start()
        {
            if (_modalPanel != null)
                _modalPanel.SetActive(false);
            if (_titleLabel != null)
                _titleLabel.text = title;
        }

        /// Show the modal with a list of wallets.
        public void Show(List<WalletInfo> wallets, string[] recommendedIds = null)
        {
            _wallets = new List<WalletInfo>(wallets);

            // Sort: recommended first
            if (recommendedIds != null || recommendedWalletIds != null)
            {
                var recIds = recommendedIds ?? recommendedWalletIds;
                _wallets.Sort((a, b) =>
                {
                    int aIdx = Array.IndexOf(recIds, a.Id);
                    int bIdx = Array.IndexOf(recIds, b.Id);
                    if (aIdx >= 0 && bIdx >= 0) return aIdx.CompareTo(bIdx);
                    if (aIdx >= 0) return -1;
                    if (bIdx >= 0) return 1;
                    return string.Compare(a.Name, b.Name, StringComparison.Ordinal);
                });
            }

            BuildWalletList();

            if (_modalPanel != null)
                _modalPanel.SetActive(true);

            _isOpen = true;
        }

        /// Close the modal.
        public void Close()
        {
            if (_modalPanel != null)
                _modalPanel.SetActive(false);

            _isOpen = false;
            OnClosed?.Invoke();
        }

        /// Show QR code for WalletConnect URI.
        public void ShowQR(string wcUri, string walletName)
        {
            if (_qrCodePanel != null)
            {
                // Set QR code texture/data
                _qrCodePanel.SetActive(true);
            }
        }

        private void BuildWalletList()
        {
            if (_walletListContainer == null || _walletCardPrefab == null)
                return;

            // Clear existing
            foreach (Transform child in _walletListContainer.transform)
                Destroy(child.gameObject);

            foreach (var wallet in _wallets)
            {
                var card = Instantiate(_walletCardPrefab, _walletListContainer.transform);
                var walletCard = card.GetComponent<WalletCard>();
                if (walletCard != null)
                {
                    walletCard.SetWallet(wallet);
                    walletCard.OnClick += () => HandleWalletSelect(wallet);
                }
            }
        }

        private void HandleWalletSelect(WalletInfo wallet)
        {
            Close();
            OnWalletSelected?.Invoke(wallet);
        }
    }
}
