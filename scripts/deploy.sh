#!/usr/bin/env bash
# Thin wrapper for sibling repos (sudoku-game / music-theory-lab / geo-contacts).
#
# Install (once per sibling repo):
#   mkdir -p scripts
#   ln -sf ../../aws-infra-dashboard/deploy/sibling/deploy.sh scripts/deploy.sh
#   # package.json → "deploy": "bash scripts/deploy.sh"
#
# Layout assumed:
#   parent/
#     aws-infra-dashboard/   ← this repo
#     sudoku-game/
#     music-theory-lab/
#     geo-contacts/
#
# Override with DASHBOARD_ROOT if the folder name differs.
set -euo pipefail

CALLER_PWD="$(pwd)"

resolve_dashboard_root() {
  if [[ -n "${DASHBOARD_ROOT:-}" ]]; then
    cd "${DASHBOARD_ROOT}" && pwd
    return 0
  fi

  # Prefer real path of this script (works when symlinked into sibling/scripts/).
  local real_script=""
  if command -v readlink >/dev/null 2>&1; then
    real_script="$(readlink -f "$0" 2>/dev/null || true)"
  fi
  if [[ -z "${real_script}" ]] && command -v realpath >/dev/null 2>&1; then
    real_script="$(realpath "$0" 2>/dev/null || true)"
  fi
  if [[ -n "${real_script}" && -f "${real_script}" ]]; then
    local sibling_dir
    sibling_dir="$(cd "$(dirname "${real_script}")/../.." && pwd)"
    if [[ -f "${sibling_dir}/scripts/deploy-project.sh" ]]; then
      echo "${sibling_dir}"
      return 0
    fi
  fi

  # Common layout: ../aws-infra-dashboard next to the sibling project.
  if [[ -f "${CALLER_PWD}/../aws-infra-dashboard/scripts/deploy-project.sh" ]]; then
    cd "${CALLER_PWD}/../aws-infra-dashboard" && pwd
    return 0
  fi

  echo ""
}

DASHBOARD_ROOT="$(resolve_dashboard_root)"
if [[ -z "${DASHBOARD_ROOT}" ]]; then
  echo "Cannot find aws-infra-dashboard. Set DASHBOARD_ROOT=/path/to/aws-infra-dashboard" >&2
  exit 1
fi

export DEPLOY_CALLER_PWD="${CALLER_PWD}"
exec bash "${DASHBOARD_ROOT}/scripts/deploy-project.sh" "$@"
