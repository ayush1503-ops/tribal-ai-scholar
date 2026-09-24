from sqlalchemy.orm import Session
from .core.database import SessionLocal, Base, engine
from .core.security import hash_password
from .models.models import User, Role, UserRoleAssignment, Applicant, Institute, Scheme, SchemeField, SchemeDocument, SchemeRule, SchemeScoreWeight, SystemSetting
from datetime import datetime, timedelta
import uuid

def seed_database():
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).filter(User.email=="admin@demo.local").first():
            print("Already seeded, skipping")
            return

        # Roles
        roles_data = [
            ("applicant", "Applicant - ST students"),
            ("institute_verifier", "Institute Verifier"),
            ("district_officer", "District/State Nodal Officer"),
            ("scheme_officer", "Scheme Officer"),
            ("selection_committee", "Selection Committee"),
            ("finance_officer", "Finance/DBT Officer"),
            ("super_admin", "Super Admin"),
            ("auditor", "Auditor")
        ]
        roles = {}
        for name, desc in roles_data:
            r = Role(name=name, description=desc)
            db.add(r)
            db.flush()
            roles[name] = r
        db.commit()

        # Institutes
        inst1 = Institute(name="Ranchi University", code="RU001", state="Jharkhand", district="Ranchi", type="university")
        inst2 = Institute(name="IIT Dhanbad", code="IITD001", state="Jharkhand", district="Dhanbad", type="university")
        inst3 = Institute(name="Central University of Jharkhand", code="CUJ001", state="Jharkhand", district="Ranchi", type="university")
        db.add_all([inst1, inst2, inst3])
        db.commit()

        # Demo users
        users_info = [
            ("applicant@demo.local", "Laxmi Hembram", "applicant", "9876543210"),
            ("officer@demo.local", "Rajesh Kumar", "district_officer", "9876543211"),
            ("admin@demo.local", "Priya Singh", "super_admin", "9876543212"),
            ("committee@demo.local", "Dr. A. Murmu", "selection_committee", "9876543213"),
            ("institute@demo.local", "Prof. S. Toppo", "institute_verifier", "9876543214"),
            ("finance@demo.local", "Anita Desai", "finance_officer", "9876543215"),
            ("auditor@demo.local", "Vikram Patel", "auditor", "9876543216"),
        ]
        users = {}
        for email, name, role_name, phone in users_info:
            u = User(email=email, full_name=name, phone=phone, password_hash=hash_password("demo123"), is_verified=True, is_active=True)
            db.add(u)
            db.flush()
            users[email] = u
            # Assign role
            role = roles[role_name]
            db.add(UserRoleAssignment(user_id=u.id, role_id=role.id))
            # Additional: admin also gets scheme_officer
            if email == "admin@demo.local":
                db.add(UserRoleAssignment(user_id=u.id, role_id=roles["scheme_officer"].id))
            if email == "officer@demo.local":
                db.add(UserRoleAssignment(user_id=u.id, role_id=roles["scheme_officer"].id))
        db.commit()

        # Applicant profile for Laxmi
        laxmi_user = users["applicant@demo.local"]
        # Get institute
        ru = db.query(Institute).filter(Institute.code=="RU001").first()
        applicant = Applicant(
            user_id=laxmi_user.id,
            full_name="Laxmi Hembram",
            dob="1998-04-12",
            gender="Female",
            category="ST",
            state="Jharkhand",
            district="Ranchi",
            mobile="9876543210",
            email="applicant@demo.local",
            address="Village Hesag, Ranchi, Jharkhand - 834001",
            institute_id=ru.id if ru else None,
            course="PhD",
            admission_year=2023,
            annual_family_income=240000,
            parent_name="Sunil Hembram",
            bank_account_placeholder="XXXX-XXXX-1234 (Demo)"
        )
        db.add(applicant)
        db.commit()

        # Create demo scheme: National Fellowship for ST Students — Demo
        scheme = Scheme(
            name="National Fellowship for ST Students — Demo",
            description="A demo fellowship scheme for ST students pursuing higher education (MPhil/PhD). This is a prototype with synthetic data. Provides financial assistance for research.",
            department="Ministry of Tribal Affairs (Demo)",
            education_level="PhD",
            target_category="ST",
            income_limit=500000,
            age_min=18,
            age_max=35,
            seats=100,
            start_date=datetime.utcnow() - timedelta(days=30),
            end_date=datetime.utcnow() + timedelta(days=60),
            status="active",
            is_published=True,
            current_version=1,
            created_by=users["admin@demo.local"].id
        )
        db.add(scheme)
        db.commit()
        db.refresh(scheme)

        # Scheme Fields - dynamic
        fields = [
            {"field_key": "full_name", "label": "Full Name (as per records)", "field_type": "text", "placeholder": "Enter full name", "required": True, "order_index": 0, "help_text": "Name as per ST certificate"},
            {"field_key": "dob", "label": "Date of Birth", "field_type": "date", "required": True, "order_index": 1},
            {"field_key": "gender", "label": "Gender", "field_type": "dropdown", "options": ["Female","Male","Other","Prefer not to say"], "required": True, "order_index": 2},
            {"field_key": "category", "label": "Category", "field_type": "radio", "options": ["ST","SC","OBC","General"], "required": True, "order_index": 3},
            {"field_key": "state", "label": "State", "field_type": "dropdown", "options": ["Jharkhand","Odisha","Chhattisgarh","West Bengal","Madhya Pradesh"], "required": True, "order_index": 4},
            {"field_key": "district", "label": "District", "field_type": "text", "placeholder": "Enter district", "required": True, "order_index": 5},
            {"field_key": "mobile", "label": "Mobile Number", "field_type": "phone", "required": True, "order_index": 6},
            {"field_key": "email", "label": "Email", "field_type": "email", "required": True, "order_index": 7},
            {"field_key": "course", "label": "Course / Program", "field_type": "dropdown", "options": ["PhD","MPhil","Masters","Bachelors"], "required": True, "order_index": 8},
            {"field_key": "research_area", "label": "Research Area", "field_type": "text", "placeholder": "e.g., Tribal Anthropology, Linguistics", "required": True, "order_index": 9, "help_text": "Added via configurator - applicant sees automatically"},
            {"field_key": "institute_name", "label": "Institute / University", "field_type": "text", "placeholder": "Enter institute name", "required": True, "order_index": 10},
            {"field_key": "admission_year", "label": "Admission Year", "field_type": "number", "required": True, "order_index": 11},
            {"field_key": "annual_family_income", "label": "Annual Family Income (₹)", "field_type": "number", "required": True, "order_index": 12, "help_text": "As per income certificate"},
            {"field_key": "parent_name", "label": "Parent / Guardian Name", "field_type": "text", "required": False, "order_index": 13},
            {"field_key": "research_proposal_title", "label": "Research Proposal Title", "field_type": "textarea", "placeholder": "Enter proposal title", "required": True, "order_index": 14},
            {"field_key": "research_proposal_summary", "label": "Research Proposal Summary", "field_type": "textarea", "placeholder": "Brief summary (500 words)", "required": False, "order_index": 15},
            {"field_key": "marks_percentage", "label": "Previous Qualifying Marks (%)", "field_type": "number", "required": True, "order_index": 16},
        ]
        for f in fields:
            db.add(SchemeField(
                scheme_id=scheme.id,
                field_key=f["field_key"],
                label=f["label"],
                field_type=f["field_type"],
                placeholder=f.get("placeholder"),
                required=f.get("required", False),
                options=f.get("options"),
                help_text=f.get("help_text"),
                order_index=f["order_index"]
            ))
        # Documents
        docs = [
            {"document_key": "st_certificate", "document_name": "ST Certificate", "required": True, "order_index": 0},
            {"document_key": "income_certificate", "document_name": "Income Certificate", "required": True, "order_index": 1},
            {"document_key": "marksheet", "document_name": "Marksheet / Degree Certificate", "required": True, "order_index": 2},
            {"document_key": "admission_proof", "document_name": "Admission Proof", "required": True, "order_index": 3},
            {"document_key": "research_proposal", "document_name": "Research Proposal Document", "required": False, "order_index": 4},
        ]
        for d in docs:
            db.add(SchemeDocument(
                scheme_id=scheme.id,
                document_key=d["document_key"],
                document_name=d["document_name"],
                required=d["required"],
                allowed_file_types=["pdf","jpg","jpeg","png"],
                max_size_mb=5,
                order_index=d["order_index"]
            ))
        # Rules - deterministic, correct operators: fail only when condition indicates ineligibility
        rules = [
            {"field_key": "category", "operator": "!=", "value": "ST", "action": "fail", "message": "Only ST category eligible - must be ST"},
            {"field_key": "annual_family_income", "operator": ">", "value": "500000", "action": "fail", "message": "Income exceeds limit ₹5,00,000"},
            {"field_key": "course", "operator": "not_in", "value": "PhD,MPhil", "action": "fail", "message": "Only PhD/MPhil eligible for this fellowship"},
            {"field_key": "required_document", "operator": "missing", "value": "st_certificate", "action": "deficiency", "message": "ST Certificate missing"},
            {"field_key": "required_document", "operator": "missing", "value": "income_certificate", "action": "deficiency", "message": "Income Certificate missing"},
        ]
        for idx, r in enumerate(rules):
            db.add(SchemeRule(scheme_id=scheme.id, field_key=r["field_key"], operator=r["operator"], value=r["value"], action=r["action"], message=r["message"], order_index=idx))
        # Score weights
        weights = [("academic",40),("research",25),("institution",15),("socio_economic",10),("interview",10)]
        for comp, wt in weights:
            db.add(SchemeScoreWeight(scheme_id=scheme.id, component=comp, weight=wt, description=f"{comp} weight"))
        # System settings
        db.add(SystemSetting(key="site_name", value="TribalScholar AI", description="Prototype site name"))
        db.add(SystemSetting(key="maintenance_mode", value=False, description="Maintenance flag"))
        db.commit()

        # Additional demo schemes
        schemes_extra = [
            {
                "name": "Post-Matric Scholarship for ST Students — Demo",
                "description": "Demo post-matric scholarship for ST students in Class 11 to PhD. Covers maintenance and fees.",
                "education_level": "Post-Matric",
                "target_category": "ST",
                "income_limit": 250000,
                "seats": 500,
            },
            {
                "name": "Overseas Fellowship Support — Demo",
                "description": "Demo support for ST students pursuing masters abroad. Prototype only.",
                "education_level": "Masters",
                "target_category": "ST",
                "income_limit": 600000,
                "seats": 20,
            }
        ]
        for s in schemes_extra:
            sch = Scheme(
                name=s["name"],
                description=s["description"],
                department="Ministry of Tribal Affairs (Demo)",
                education_level=s["education_level"],
                target_category=s["target_category"],
                income_limit=s["income_limit"],
                seats=s["seats"],
                start_date=datetime.utcnow() - timedelta(days=10),
                end_date=datetime.utcnow() + timedelta(days=90),
                status="active",
                is_published=True,
                current_version=1,
                created_by=users["admin@demo.local"].id
            )
            db.add(sch)
            db.commit()
            # Minimal fields for extra
            db.add(SchemeField(scheme_id=sch.id, field_key="full_name", label="Full Name", field_type="text", required=True, order_index=0))
            db.add(SchemeField(scheme_id=sch.id, field_key="annual_family_income", label="Annual Income", field_type="number", required=True, order_index=1))
            db.add(SchemeDocument(scheme_id=sch.id, document_key="st_certificate", document_name="ST Certificate", required=True, order_index=0))
            db.add(SchemeDocument(scheme_id=sch.id, document_key="income_certificate", document_name="Income Certificate", required=True, order_index=1))
            for comp, wt in weights:
                db.add(SchemeScoreWeight(scheme_id=sch.id, component=comp, weight=wt))
        db.commit()
        print("Seed completed: demo users, schemes, and applicant profile created")

    except Exception as e:
        db.rollback()
        print(f"Seed error: {e}")
        raise
    finally:
        db.close()
