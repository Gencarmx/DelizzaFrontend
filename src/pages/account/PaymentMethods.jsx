"use client"

import { Plus, CreditCard, Trash2 } from "lucide-react"
import Header from "../../components/Header"
import { useApp } from "../../context/AppContext"
import "../../pagesCss/account/PaymentMethods.css"

function PaymentMethods() {
  const { savedPaymentMethods } = useApp()

  return (
    <div className="payment-methods-page">
      <Header title="Métodos de pago" showBack={true} />

      <div className="payment-content">
        <button className="add-payment-btn">
          <Plus size={20} />
          <span>Agregar método de pago</span>
        </button>

        <div className="payment-list">
          {savedPaymentMethods.map((method) => (
            <div key={method.id} className="payment-card">
              <div className="payment-icon">
                <CreditCard size={24} />
              </div>
              <div className="payment-info">
                <h3 className="payment-type">{method.type.toUpperCase()}</h3>
                <p className="payment-number">**** **** **** {method.last4}</p>
                {method.isDefault && <span className="default-badge">Predeterminado</span>}
              </div>
              <button className="delete-payment-btn">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PaymentMethods
