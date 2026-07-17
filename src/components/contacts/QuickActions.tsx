import { Link } from 'react-router-dom'
import { Map as MapIcon, Upload, Network } from 'lucide-react'

export function QuickActions() {
  return (
    <div className="quick-actions">
      <Link to="/family" className="quick-action-card">
        <div className="quick-action-icon">
          <Network size={18} />
        </div>
        <strong>查看族谱</strong>
        <span>父母、配偶与世代关系</span>
      </Link>
      <Link to="/import" className="quick-action-card">
        <div className="quick-action-icon">
          <Upload size={18} />
        </div>
        <strong>导入联系人</strong>
        <span>支持 vCard、CSV、JSON</span>
      </Link>
      <Link to="/map" className="quick-action-card">
        <div className="quick-action-icon">
          <MapIcon size={18} />
        </div>
        <strong>查看地图</strong>
        <span>按籍贯和现居地分布</span>
      </Link>
    </div>
  )
}
