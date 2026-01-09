export const MOCK_ROUTINES = {
    // We will just search by routine name now given the user chooses manually
    "Pecho / Espalda": {
        name: "Pecho / Espalda",
        exercises: [
            { id: "e1", name: "Press de Banca con Barra", muscle: "Pecho", notes: "Usa soportes de seguridad" },
            { id: "e4", name: "Dominadas con Lastre", muscle: "Espalda", notes: "" },
            { id: "e2", name: "Press Militar con Mancuernas", muscle: "Hombros", notes: "Sentado" },
             { id: "e5", name: "Remo con Barra", muscle: "Espalda", notes: "Agarre supino" },
        ]
    },
    // Remap English keys to Spanish expected names or just generic lookups
    "Pierna": {
        name: "Pierna",
        exercises: [
            { id: "e7", name: "Sentadilla Libre", muscle: "Piernas", notes: "¡Profunda!" },
            { id: "e8", name: "Peso Muerto Rumano", muscle: "Piernas", notes: "Siente el estiramiento" }
        ]
    },
    "Brazos": {
        name: "Brazos",
        exercises: [
            { id: "e3", name: "Extensiones de Tríceps", muscle: "Tríceps", notes: "Con cuerda" },
            { id: "e6", name: "Face Pulls", muscle: "Hombros", notes: "" }
        ]
    }
}