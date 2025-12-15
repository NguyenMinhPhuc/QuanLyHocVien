import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { authFetch } from '../../lib/auth'

export default function ReceiptPage() {
  const router = useRouter()
  const { receiptId } = router.query
  const [receipt, setReceipt] = useState(null)
  const [details, setDetails] = useState(null)
  const [settings, setSettings] = useState({})

  useEffect(() => {
    if (!receiptId) return
    (async () => {
      try {
        const res = await authFetch(`/api/receipts/${receiptId}`)
        if (!res.ok) throw new Error('Failed to load receipt')
        const data = await res.json()
        // expected shape: { receipt, details, settings }
        setReceipt(data.receipt)
        setDetails(data.details || {})
        // apply settings
        if (data.settings) setSettings(data.settings)
        // auto-print for convenience
        setTimeout(() => { window.print(); }, 300)
      } catch (err) {
        console.error(err)
      }
    })()
  }, [receiptId])

  if (!receipt) return <div className="p-4">Loading...</div>

  const d = details || {}
  // helper render row
  const Row = ({ label, value }) => (<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}><div>{label}</div><div>{value}</div></div>);

  return (
    <div style={{ width: 800, margin: '0 auto', fontFamily: 'Times New Roman, serif', padding: 24 }}>
      <div style={{ position: 'relative' }}>
        {/* background template if provided */}
        {settings && settings.receipt_template_url ? (
          <img src={settings.receipt_template_url} alt="template" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 1, zIndex: 0 }} />
        ) : null}

        <div style={{ position: 'relative', zIndex: 2, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ maxWidth: '60%' }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>TRUNG TÂM ANH NGỮ</div>
              <div style={{ fontSize: 12 }}>{settings && settings.receipt_center_address ? settings.receipt_center_address : 'Địa chỉ: ...'}</div>
              <div style={{ fontSize: 12 }}>{settings && settings.receipt_center_website ? settings.receipt_center_website : ''}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12 }}>Mẫu số: 01-05/BLP</div>
              <div style={{ fontSize: 12 }}>Ký hiệu: AA/2012P</div>
              <div style={{ fontSize: 12 }}>Số: {receipt.receipt_number || ''}</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 28, letterSpacing: 1 }}>BIÊN LAI THU HỌC PHÍ</h2>
            <div style={{ fontSize: 12, marginTop: 6 }}>Liên 1: Lưu</div>
          </div>

          <div style={{ marginTop: 16, lineHeight: '28px' }}>
            <div>Họ tên người nộp tiền: <span style={{ fontWeight: 700 }}>{d.payer_name || d.student_name || ''}</span></div>
            <div>Địa chỉ: <span style={{ fontWeight: 700 }}>{d.payer_address || ''}</span></div>
            <div>Lý do thu: <span style={{ fontWeight: 700 }}>{d.note || 'Học phí'}</span></div>
            <div>Số tiền: <span style={{ fontWeight: 700 }}>{(Number(d.amount || 0).toLocaleString() + ' đ')}</span></div>
            <div>Hình thức thanh toán: <span style={{ fontWeight: 700 }}>{d.method || ''}</span></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40 }}>
            <div style={{ textAlign: 'left' }}>
              <div>Ngày {new Date(receipt.created_at).getDate()} tháng {new Date(receipt.created_at).getMonth() + 1} năm {new Date(receipt.created_at).getFullYear()}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div>Người thu tiền</div>
              <div style={{ marginTop: 40 }}>(Ký và ghi rõ họ tên)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
