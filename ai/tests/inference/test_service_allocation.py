from ai.inference.service import HeuristicModel, Position, _compute_allocation


def test_compute_allocation_returns_normalized_weights():
    positions = [
        Position(vault_id="stable", amount=100, apy_bps=600, risk_score=20),
        Position(vault_id="growth", amount=100, apy_bps=1200, risk_score=60),
    ]

    allocation = _compute_allocation(positions=positions, target_risk_score=30)

    assert len(allocation) == 2
    assert abs(sum(item["weight"] for item in allocation) - 1.0) < 1e-6
    assert all(item["recommended_amount"] >= 0 for item in allocation)


def test_heuristic_model_predict_is_bounded():
    model = HeuristicModel()
    model.load_state({})

    probability = model.predict(
        {
            "positions": [
                {"amount": 200, "risk_score": 30},
                {"amount": 100, "risk_score": 60},
            ],
            "target_risk_score": 40,
        }
    )

    assert 0.0 <= probability <= 1.0
